import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { Err } from '../lib/errors'
import { snapshotPage, getVersions, getVersionContent } from '../services/versioning'

const router = Router()

const CreatePageSchema = z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(200).regex(/^[a-z0-9-/]+$/, 'Invalid slug'),
    content: z.string().default('{}'),
    metaTitle: z.string().max(60).optional(),
    metaDesc: z.string().max(160).optional(),
})

const UpdatePageSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    metaTitle: z.string().max(60).nullable().optional(),
    metaDesc: z.string().max(160).nullable().optional(),
})

async function assertSiteOwner(siteId: string, userId: string, res: Response) {
    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (!site) { Err.notFound(res, 'Site not found'); return null }
    if (site.ownerId !== userId) { Err.forbidden(res); return null }
    return site
}

// helper — extracts a param as plain string
function p(req: Request, key: string): string {
    const val = (req.params as Record<string, string>)[key]
    return String(val)
}

// GET /api/pages?siteId=xxx
router.get('/', requireAuth, async (req: Request, res: Response) => {
    const siteId = String(req.query.siteId ?? '')
    if (!siteId) return Err.bad(res, 'siteId query param required')

    const site = await assertSiteOwner(siteId, req.user!.userId, res)
    if (!site) return

    const pages = await prisma.page.findMany({
        where: { siteId },
        select: {
            id: true, title: true, slug: true,
            metaTitle: true, metaDesc: true,
            seoScore: true, decayScore: true, decayedAt: true,
            publishedAt: true, createdAt: true, updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
    })
    return res.json({ pages })
})

// GET /api/pages/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true, name: true, slug: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)
    return res.json({ page })
})

// POST /api/pages?siteId=xxx
router.post('/', requireAuth, async (req: Request, res: Response) => {
    const siteId = String(req.query.siteId ?? '')
    if (!siteId) return Err.bad(res, 'siteId query param required')

    const site = await assertSiteOwner(siteId, req.user!.userId, res)
    if (!site) return

    const parsed = CreatePageSchema.safeParse(req.body)
    if (!parsed.success) return Err.bad(res, parsed.error.issues[0].message)

    const conflict = await prisma.page.findUnique({
        where: { siteId_slug: { siteId, slug: parsed.data.slug } },
    })
    if (conflict) return Err.bad(res, 'A page with this slug already exists in this site')

    const page = await prisma.page.create({
        data: { ...parsed.data, siteId },
    })

    await snapshotPage(page.id)
    return res.status(201).json({ page })
})

// PATCH /api/pages/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)

    const parsed = UpdatePageSchema.safeParse(req.body)
    if (!parsed.success) return Err.bad(res, parsed.error.issues[0].message)

    if (parsed.data.slug && parsed.data.slug !== page.slug) {
        const conflict = await prisma.page.findUnique({
            where: { siteId_slug: { siteId: page.siteId, slug: parsed.data.slug } },
        })
        if (conflict) return Err.bad(res, 'Slug already used on this site')
    }

    const updated = await prisma.page.update({
        where: { id },
        data: parsed.data,
    })

    const version = await snapshotPage(id)
    return res.json({ page: updated, version })
})

// POST /api/pages/:id/publish
router.post('/:id/publish', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)

    const updated = await prisma.page.update({
        where: { id },
        data: { publishedAt: new Date() },
    })
    return res.json({ page: updated })
})

// POST /api/pages/:id/unpublish
router.post('/:id/unpublish', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)

    const updated = await prisma.page.update({
        where: { id },
        data: { publishedAt: null },
    })
    return res.json({ page: updated })
})

// DELETE /api/pages/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)

    await prisma.$transaction([
        prisma.aiReport.deleteMany({ where: { pageId: id } }),
        prisma.pageVersion.deleteMany({ where: { pageId: id } }),
        prisma.page.delete({ where: { id } }),
    ])
    return res.json({ deleted: true })
})

// GET /api/pages/:id/versions
router.get('/:id/versions', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)

    const versions = await getVersions(id)
    return res.json({ versions })
})

// GET /api/pages/:id/versions/:version
router.get('/:id/versions/:version', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const version = parseInt(p(req, 'version'), 10)

    const page = await prisma.page.findUnique({
        where: { id },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) return Err.notFound(res, 'Page not found')
    if (page.site.ownerId !== req.user!.userId) return Err.forbidden(res)

    const v = await getVersionContent(id, version)
    if (!v) return Err.notFound(res, 'Version not found')
    return res.json({ version: v })
})

export default router