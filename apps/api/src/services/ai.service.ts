// apps/api/src/services/ai.service.ts
import { chat } from '../lib/ai'
import { prisma } from '../lib/prisma'
import { getVersionContent } from './versioning'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SemanticDiffReport {
    summary: string
    intentShift: string
    toneChange: string
    keywordImpact: string
    ctaChange: string
    seoRisk: 'low' | 'medium' | 'high'
    changes: Array<{ type: string; description: string; impact: string }>
}

export interface SeoReport {
    score: number          // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    summary: string
    titleAnalysis: { current: string; issues: string[]; suggestion: string }
    descAnalysis: { current: string; issues: string[]; suggestion: string }
    contentAnalysis: { wordCount: number; readability: string; keywordDensity: string; issues: string[] }
    structureAnalysis: { issues: string[]; suggestions: string[] }
    quickWins: string[]
}

export interface DecayReport {
    score: number          // 0-100, higher = fresher
    domain: string
    estimatedDecayMonths: number
    daysUntilStale: number
    riskLevel: 'fresh' | 'aging' | 'stale' | 'critical'
    reasons: string[]
    refreshSuggestions: string[]
    topicsToUpdate: string[]
}

export interface UnifiedReport {
    overallScore: number
    publishReady: boolean
    semanticDiff: SemanticDiffReport | null
    seo: SeoReport
    decay: DecayReport
    topPriorities: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string, fallback: T): T {
    try {
        const cleaned = raw.replace(/```json|```/g, '').trim()
        return JSON.parse(cleaned) as T
    } catch {
        return fallback
    }
}

function extractText(content: string): string {
    try {
        const parsed = JSON.parse(content)
        if (!parsed.blocks) return content
        return parsed.blocks
            .map((b: { text?: string; content?: string }) => b.text ?? b.content ?? '')
            .filter(Boolean)
            .join('\n')
    } catch {
        return content
    }
}

// ─── 1. Semantic Diff ─────────────────────────────────────────────────────────

export async function runSemanticDiff(
    pageId: string,
    versionA: number,
    versionB: number
): Promise<SemanticDiffReport> {
    const [va, vb] = await Promise.all([
        getVersionContent(pageId, versionA),
        getVersionContent(pageId, versionB),
    ])

    if (!va || !vb) throw new Error('One or both versions not found')

    const textA = extractText(va.content)
    const textB = extractText(vb.content)

    const raw = await chat([
        {
            role: 'system',
            content: `You are a content intelligence engine for a CMS. 
Analyze the semantic difference between two versions of a webpage.
Focus on meaning-level changes, not character-level diffs.
Respond ONLY with a valid JSON object — no markdown, no preamble.`,
        },
        {
            role: 'user',
            content: `Compare these two versions of the same page.

VERSION A (older):
${textA}

VERSION B (newer):
${textB}

Return a JSON object with this exact shape:
{
  "summary": "1-2 sentence plain English summary of what changed semantically",
  "intentShift": "how the page's purpose or goal shifted (or 'none')",
  "toneChange": "how the tone/voice changed (or 'none')",
  "keywordImpact": "which important keywords were added, removed, or diluted",
  "ctaChange": "how calls-to-action changed (or 'none')",
  "seoRisk": "low|medium|high",
  "changes": [
    { "type": "category of change", "description": "what changed", "impact": "why it matters for SEO/UX" }
  ]
}`,
        },
    ])

    return parseJson<SemanticDiffReport>(raw, {
        summary: 'Unable to analyze diff',
        intentShift: 'unknown',
        toneChange: 'unknown',
        keywordImpact: 'unknown',
        ctaChange: 'unknown',
        seoRisk: 'medium',
        changes: [],
    })
}

// ─── 2. SEO Analysis ──────────────────────────────────────────────────────────

export async function runSeoAnalysis(pageId: string): Promise<SeoReport> {
    const page = await prisma.page.findUnique({
        where: { id: pageId },
        include: { site: { select: { name: true, slug: true } } },
    })
    if (!page) throw new Error('Page not found')

    const contentText = extractText(page.content)

    const raw = await chat([
        {
            role: 'system',
            content: `You are an expert SEO analyst embedded in a CMS.
Analyze both the content AND the structural metadata of a webpage.
Be specific, actionable, and honest about issues.
Respond ONLY with a valid JSON object — no markdown, no preamble.`,
        },
        {
            role: 'user',
            content: `Perform a full SEO analysis of this page.

SITE: ${page.site.name} (/${page.site.slug})
PAGE TITLE TAG: ${page.metaTitle ?? '(not set)'}
META DESCRIPTION: ${page.metaDesc ?? '(not set)'}
PAGE HEADING: ${page.title}
PAGE SLUG: /${page.slug}
CONTENT:
${contentText}

Return a JSON object with this exact shape:
{
  "score": <integer 0-100>,
  "grade": "A|B|C|D|F",
  "summary": "2-3 sentence overall assessment",
  "titleAnalysis": {
    "current": "${page.metaTitle ?? ''}",
    "issues": ["list of specific issues"],
    "suggestion": "improved title tag text"
  },
  "descAnalysis": {
    "current": "${page.metaDesc ?? ''}",
    "issues": ["list of specific issues"],
    "suggestion": "improved meta description text"
  },
  "contentAnalysis": {
    "wordCount": <integer>,
    "readability": "Flesch reading ease label e.g. Easy / Standard / Difficult",
    "keywordDensity": "assessment of keyword usage",
    "issues": ["list of content-level issues"]
  },
  "structureAnalysis": {
    "issues": ["heading hierarchy, slug, schema issues"],
    "suggestions": ["actionable structural fixes"]
  },
  "quickWins": ["top 3 highest-impact single fixes"]
}`,
        },
    ])

    const report = parseJson<SeoReport>(raw, {
        score: 0,
        grade: 'F',
        summary: 'Analysis failed',
        titleAnalysis: { current: '', issues: [], suggestion: '' },
        descAnalysis: { current: '', issues: [], suggestion: '' },
        contentAnalysis: { wordCount: 0, readability: '', keywordDensity: '', issues: [] },
        structureAnalysis: { issues: [], suggestions: [] },
        quickWins: [],
    })

    // Persist score back to page
    await prisma.page.update({
        where: { id: pageId },
        data: { seoScore: report.score },
    })

    return report
}

// ─── 3. Decay Model ───────────────────────────────────────────────────────────

const DOMAIN_DECAY_RATES: Record<string, number> = {
    technology: 4,
    finance: 6,
    news: 1,
    health: 12,
    legal: 18,
    education: 18,
    marketing: 6,
    ecommerce: 3,
    travel: 9,
    food: 24,
    general: 12,
}

export async function runDecayAnalysis(pageId: string): Promise<DecayReport> {
    const page = await prisma.page.findUnique({ where: { id: pageId } })
    if (!page) throw new Error('Page not found')

    const contentText = extractText(page.content)
    const daysSinceUpdate = Math.floor(
        (Date.now() - page.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const raw = await chat([
        {
            role: 'system',
            content: `You are a content freshness analyst for a CMS.
Assess how quickly this content will become outdated based on its topic domain and content signals.
Use real-world knowledge of how fast different content domains change.
Respond ONLY with a valid JSON object — no markdown, no preamble.`,
        },
        {
            role: 'user',
            content: `Analyze the decay risk of this page.

PAGE TITLE: ${page.title}
META TITLE: ${page.metaTitle ?? '(not set)'}
DAYS SINCE LAST UPDATE: ${daysSinceUpdate}
CONTENT:
${contentText.slice(0, 2000)}

Domain decay reference (months until typically stale):
${JSON.stringify(DOMAIN_DECAY_RATES, null, 2)}

Return a JSON object with this exact shape:
{
  "score": <integer 0-100, where 100 = perfectly fresh, 0 = critically stale>,
  "domain": "the single best-fit domain category from the reference",
  "estimatedDecayMonths": <integer months until this content type typically needs refresh>,
  "daysUntilStale": <integer days from today until this specific page will likely be stale>,
  "riskLevel": "fresh|aging|stale|critical",
  "reasons": ["specific signals in this content that drive decay risk"],
  "refreshSuggestions": ["concrete actions to keep this page fresh"],
  "topicsToUpdate": ["specific sections or claims likely to go stale first"]
}`,
        },
    ])

    const report = parseJson<DecayReport>(raw, {
        score: 50,
        domain: 'general',
        estimatedDecayMonths: 12,
        daysUntilStale: 180,
        riskLevel: 'aging',
        reasons: [],
        refreshSuggestions: [],
        topicsToUpdate: [],
    })

    // Persist decay score + estimated stale date back to page
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() + report.daysUntilStale)

    await prisma.page.update({
        where: { id: pageId },
        data: { decayScore: report.score, decayedAt: staleDate },
    })

    return report
}

// ─── 4. Unified Report ────────────────────────────────────────────────────────

export async function runUnifiedReport(
    pageId: string,
    versionA?: number,
    versionB?: number
): Promise<UnifiedReport> {
    // Run SEO + Decay in parallel; diff only if both versions provided
    const [seo, decay, semanticDiff] = await Promise.all([
        runSeoAnalysis(pageId),
        runDecayAnalysis(pageId),
        versionA !== undefined && versionB !== undefined
            ? runSemanticDiff(pageId, versionA, versionB)
            : Promise.resolve(null),
    ])

    const overallScore = Math.round(
        (seo.score + decay.score + (semanticDiff ? (semanticDiff.seoRisk === 'low' ? 100 : semanticDiff.seoRisk === 'medium' ? 60 : 30) : 80)) / 3
    )

    const publishReady = seo.score >= 60 && decay.score >= 50

    const topPriorities: string[] = [
        ...seo.quickWins.slice(0, 2),
        ...(decay.refreshSuggestions.slice(0, 1)),
        ...(semanticDiff?.seoRisk === 'high' ? ['Review semantic changes — high SEO risk detected'] : []),
    ].slice(0, 4)

    // Persist unified AI report to DB
    await prisma.aiReport.create({
        data: {
            pageId,
            type: 'unified',
            previousVersion: versionA ?? null,
            currentVersion: versionB ?? null,
            report: JSON.stringify({ seo, decay, semanticDiff }),
            seoScore: seo.score,
            decayScore: decay.score,
            decayDomain: decay.domain,
        },
    })

    return { overallScore, publishReady, semanticDiff, seo, decay, topPriorities }
}