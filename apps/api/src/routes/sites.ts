import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { Err } from '../lib/errors'

const router = Router()

function p(req: Request, key: string): string {
    return String((req.params as Record<string, string>)[key])
}

const CreateSiteSchema = z.object({
    name: z.string().min(2).max(80),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, hyphens only'),
})

const UpdateSiteSchema = CreateSiteSchema.partial()

router.get('/', requireAuth, async (req: Request, res: Response) => {
    const sites = await prisma.site.findMany({
        where: { ownerId: req.user!.userId },
        include: { _count: { select: { pages: true } } },
        orderBy: { createdAt: 'desc' },
    })
    return res.json({ sites })
})

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const site = await prisma.site.findUnique({
        where: { id },
        include: {
            pages: {
                select: {
                    id: true, title: true, slug: true,
                    seoScore: true, decayScore: true,
                    publishedAt: true, updatedAt: true,
                },
                orderBy: { updatedAt: 'desc' },
            },
        },
    })
    if (!site) return Err.notFound(res, 'Site not found')
    if (site.ownerId !== req.user!.userId) return Err.forbidden(res)
    return res.json({ site })
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
    const parsed = CreateSiteSchema.safeParse(req.body)
    if (!parsed.success) return Err.bad(res, parsed.error.issues[0].message)

    const existing = await prisma.site.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return Err.bad(res, 'Slug already taken')

    const site = await prisma.site.create({
        data: { ...parsed.data, ownerId: req.user!.userId },
    })
    return res.status(201).json({ site })
})

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const parsed = UpdateSiteSchema.safeParse(req.body)
    if (!parsed.success) return Err.bad(res, parsed.error.issues[0].message)

    const site = await prisma.site.findUnique({ where: { id } })
    if (!site) return Err.notFound(res, 'Site not found')
    if (site.ownerId !== req.user!.userId) return Err.forbidden(res)

    if (parsed.data.slug && parsed.data.slug !== site.slug) {
        const conflict = await prisma.site.findUnique({ where: { slug: parsed.data.slug } })
        if (conflict) return Err.bad(res, 'Slug already taken')
    }

    const updated = await prisma.site.update({ where: { id }, data: parsed.data })
    return res.json({ site: updated })
})

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    const id = p(req, 'id')
    const site = await prisma.site.findUnique({ where: { id } })
    if (!site) return Err.notFound(res, 'Site not found')
    if (site.ownerId !== req.user!.userId) return Err.forbidden(res)

    await prisma.$transaction([
        prisma.aiReport.deleteMany({ where: { page: { siteId: id } } }),
        prisma.pageVersion.deleteMany({ where: { page: { siteId: id } } }),
        prisma.page.deleteMany({ where: { siteId: id } }),
        prisma.site.delete({ where: { id } }),
    ])
    return res.json({ deleted: true })
})

export default router