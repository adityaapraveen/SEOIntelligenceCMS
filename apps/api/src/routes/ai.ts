// apps/api/src/routes/ai.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { Err } from '../lib/errors'
import {
    runSemanticDiff,
    runSeoAnalysis,
    runDecayAnalysis,
    runUnifiedReport,
} from '../services/ai.service'

const router = Router()

function p(req: Request, key: string): string {
    return String((req.params as Record<string, string>)[key])
}

// Guard: verify page belongs to current user
async function assertPageOwner(pageId: string, userId: string, res: Response) {
    const page = await prisma.page.findUnique({
        where: { id: pageId },
        include: { site: { select: { ownerId: true } } },
    })
    if (!page) { Err.notFound(res, 'Page not found'); return null }
    if (page.site.ownerId !== userId) { Err.forbidden(res); return null }
    return page
}

// POST /api/ai/pages/:id/diff
// Body: { versionA: number, versionB: number }
router.post('/pages/:id/diff', requireAuth, async (req: Request, res: Response) => {
    const pageId = p(req, 'id')
    const page = await assertPageOwner(pageId, req.user!.userId, res)
    if (!page) return

    const parsed = z.object({
        versionA: z.number().int().positive(),
        versionB: z.number().int().positive(),
    }).safeParse(req.body)
    if (!parsed.success) return Err.bad(res, parsed.error.issues[0].message)

    try {
        const report = await runSemanticDiff(pageId, parsed.data.versionA, parsed.data.versionB)

        // Persist to DB
        await prisma.aiReport.create({
            data: {
                pageId,
                type: 'semantic_diff',
                previousVersion: parsed.data.versionA,
                currentVersion: parsed.data.versionB,
                report: JSON.stringify(report),
            },
        })

        return res.json({ report })
    } catch (err: any) {
        return Err.internal(res, err.message)
    }
})

// POST /api/ai/pages/:id/seo
router.post('/pages/:id/seo', requireAuth, async (req: Request, res: Response) => {
    const pageId = p(req, 'id')
    const page = await assertPageOwner(pageId, req.user!.userId, res)
    if (!page) return

    try {
        const report = await runSeoAnalysis(pageId)

        await prisma.aiReport.create({
            data: {
                pageId,
                type: 'seo',
                report: JSON.stringify(report),
                seoScore: report.score,
            },
        })

        return res.json({ report })
    } catch (err: any) {
        return Err.internal(res, err.message)
    }
})

// POST /api/ai/pages/:id/decay
router.post('/pages/:id/decay', requireAuth, async (req: Request, res: Response) => {
    const pageId = p(req, 'id')
    const page = await assertPageOwner(pageId, req.user!.userId, res)
    if (!page) return

    try {
        const report = await runDecayAnalysis(pageId)

        await prisma.aiReport.create({
            data: {
                pageId,
                type: 'decay',
                report: JSON.stringify(report),
                decayScore: report.score,
                decayDomain: report.domain,
            },
        })

        return res.json({ report })
    } catch (err: any) {
        return Err.internal(res, err.message)
    }
})

// POST /api/ai/pages/:id/report
// Body (optional): { versionA: number, versionB: number }
router.post('/pages/:id/report', requireAuth, async (req: Request, res: Response) => {
    const pageId = p(req, 'id')
    const page = await assertPageOwner(pageId, req.user!.userId, res)
    if (!page) return

    const parsed = z.object({
        versionA: z.number().int().positive().optional(),
        versionB: z.number().int().positive().optional(),
    }).safeParse(req.body)
    if (!parsed.success) return Err.bad(res, parsed.error.issues[0].message)

    try {
        const report = await runUnifiedReport(
            pageId,
            parsed.data.versionA,
            parsed.data.versionB
        )
        return res.json({ report })
    } catch (err: any) {
        return Err.internal(res, err.message)
    }
})

// GET /api/ai/pages/:id/reports — list all past AI reports for a page
router.get('/pages/:id/reports', requireAuth, async (req: Request, res: Response) => {
    const pageId = p(req, 'id')
    const page = await assertPageOwner(pageId, req.user!.userId, res)
    if (!page) return

    const reports = await prisma.aiReport.findMany({
        where: { pageId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, type: true,
            seoScore: true, decayScore: true, decayDomain: true,
            previousVersion: true, currentVersion: true,
            createdAt: true,
        },
    })
    return res.json({ reports })
})

// GET /api/ai/pages/:id/reports/:reportId — get a single full report
router.get('/pages/:id/reports/:reportId', requireAuth, async (req: Request, res: Response) => {
    const pageId = p(req, 'id')
    const reportId = p(req, 'reportId')

    const page = await assertPageOwner(pageId, req.user!.userId, res)
    if (!page) return

    const report = await prisma.aiReport.findUnique({ where: { id: reportId } })
    if (!report) return Err.notFound(res, 'Report not found')
    if (report.pageId !== pageId) return Err.forbidden(res)

    return res.json({ report: { ...report, report: JSON.parse(report.report) } })
})

export default router