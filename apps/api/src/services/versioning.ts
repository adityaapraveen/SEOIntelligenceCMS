// apps/api/src/services/versioning.ts
import { prisma } from '../lib/prisma'

export async function snapshotPage(pageId: string): Promise<number> {
    const page = await prisma.page.findUnique({
        where: { id: pageId },
        select: { content: true, metaTitle: true, metaDesc: true },
    })
    if (!page) throw new Error(`Page ${pageId} not found`)

    const latest = await prisma.pageVersion.findFirst({
        where: { pageId },
        orderBy: { version: 'desc' },
        select: { version: true },
    })

    const nextVersion = (latest?.version ?? 0) + 1

    await prisma.pageVersion.create({
        data: {
            pageId,
            content: page.content,
            metaTitle: page.metaTitle,
            metaDesc: page.metaDesc,
            version: nextVersion,
        },
    })

    return nextVersion
}

export async function getVersions(pageId: string) {
    return prisma.pageVersion.findMany({
        where: { pageId },
        orderBy: { version: 'desc' },
        select: {
            id: true, version: true,
            metaTitle: true, createdAt: true,
        },
    })
}

export async function getVersionContent(pageId: string, version: number) {
    return prisma.pageVersion.findFirst({
        where: { pageId, version },
    })
}