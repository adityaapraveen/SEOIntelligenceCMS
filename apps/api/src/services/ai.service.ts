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

export interface SeoIssue {
    issue: string
    severity: 'critical' | 'warning' | 'info'
    why: string
}

export interface SeoReport {
    score: number          // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    summary: string
    titleAnalysis: {
        current: string
        charCount: number
        pixelEstimate: number
        issues: SeoIssue[]
        suggestion: string
    }
    descAnalysis: {
        current: string
        charCount: number
        issues: SeoIssue[]
        suggestion: string
    }
    contentAnalysis: {
        wordCount: number
        readabilityGrade: string
        avgSentenceLength: number
        passiveVoicePercent: number
        keywordDensity: string
        primaryKeyword: string
        issues: SeoIssue[]
    }
    headingStructure: {
        h1Count: number
        h2Count: number
        h3Count: number
        hierarchy: string
        issues: SeoIssue[]
        suggestions: string[]
    }
    keywordOptimization: {
        primaryKeyword: string
        secondaryKeywords: string[]
        keywordInTitle: boolean
        keywordInH1: boolean
        keywordInFirst100Words: boolean
        keywordInSlug: boolean
        keywordInMetaDesc: boolean
        issues: SeoIssue[]
    }
    internalLinking: {
        estimatedLinks: number
        issues: SeoIssue[]
        suggestions: string[]
    }
    urlSlugAnalysis: {
        current: string
        length: number
        issues: SeoIssue[]
        suggestion: string
    }
    readability: {
        fleschScore: number
        gradeLevel: string
        avgWordsPerSentence: number
        complexWordPercent: number
        issues: SeoIssue[]
    }
    schemaMarkup: {
        recommended: string[]
        issues: SeoIssue[]
    }
    imageSeo: {
        estimatedImages: number
        issues: SeoIssue[]
        suggestions: string[]
    }
    mobileUx: {
        issues: SeoIssue[]
        suggestions: string[]
    }
    coreWebVitals: {
        lcpRisk: 'low' | 'medium' | 'high'
        clsRisk: 'low' | 'medium' | 'high'
        fidRisk: 'low' | 'medium' | 'high'
        issues: SeoIssue[]
    }
    technicalSeo: {
        canonicalNeeded: boolean
        openGraphComplete: boolean
        twitterCardReady: boolean
        robotsDirective: string
        issues: SeoIssue[]
    }
    quickWins: Array<{ action: string; impact: 'high' | 'medium' | 'low'; effort: 'easy' | 'moderate' | 'hard'; why: string }>
    competitiveInsights: {
        estimatedDifficulty: 'low' | 'medium' | 'high'
        contentGaps: string[]
        differentiators: string[]
    }
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
    // Strategy 1: direct parse
    try { return JSON.parse(raw) as T } catch { }

    // Strategy 2: strip markdown fences
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    try { return JSON.parse(stripped) as T } catch { }

    // Strategy 3: extract the first { ... } block (greedy)
    const braceMatch = stripped.match(/\{[\s\S]*\}/)
    if (braceMatch) {
        try { return JSON.parse(braceMatch[0]) as T } catch {
            // Strategy 3b: try to repair common issues
            let repaired = braceMatch[0]
                .replace(/,\s*([\]}])/g, '$1')       // trailing commas
                .replace(/'/g, '"')                    // single quotes
                .replace(/(\w+)\s*:/g, '"$1":')        // unquoted keys (rough)
                .replace(/""+/g, '"')                   // doubled quotes from above
            try { return JSON.parse(repaired) as T } catch { }
        }
    }

    // Strategy 4: try line-by-line JSON extraction
    const lines = raw.split('\n')
    const jsonStart = lines.findIndex(l => l.trim().startsWith('{'))
    const jsonEnd = lines.length - 1 - [...lines].reverse().findIndex(l => l.trim().endsWith('}'))
    if (jsonStart >= 0 && jsonEnd >= jsonStart) {
        const block = lines.slice(jsonStart, jsonEnd + 1).join('\n')
        try { return JSON.parse(block) as T } catch { }
    }

    console.error('[AI parseJson] Could not parse AI response. Raw output (first 500 chars):', raw.slice(0, 500))
    return fallback
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
    const wordCount = contentText.split(/\s+/).filter(Boolean).length

    let raw: string
    try {
        raw = await chat([
            {
                role: 'system',
                content: `You are a world-class technical SEO analyst and content strategist. You perform exhaustive, enterprise-grade SEO audits. Every issue MUST include a "why" field explaining the SEO impact. You MUST respond with ONLY a valid JSON object — no markdown fences, no preamble, no explanation text.`,
            },
            {
                role: 'user',
                content: `Perform an exhaustive technical SEO audit of this page. Return ONLY valid JSON.

SITE: ${page.site.name} (/${page.site.slug})
PAGE TITLE TAG: ${page.metaTitle ?? '(not set)'}
META DESCRIPTION: ${page.metaDesc ?? '(not set)'}
PAGE HEADING (H1): ${page.title}
PAGE SLUG: /${page.slug}
WORD COUNT: ${wordCount}
CONTENT:
${contentText.slice(0, 4000)}

RULES:
- Every "issues" array MUST contain objects with: { "issue": string, "severity": "critical"|"warning"|"info", "why": string }
- The "why" field must explain the technical SEO reason WHY this matters (e.g. ranking signal, crawlability, CTR impact)
- Every array MUST have at least 1 item. Do NOT return empty arrays.
- Be specific and technical. Reference Google's guidelines, Core Web Vitals, E-E-A-T, etc.
- Quick wins must include impact/effort assessment.

Return this exact JSON structure:
{
  "score": 65,
  "grade": "C",
  "summary": "2-3 sentence technical assessment.",
  "titleAnalysis": {
    "current": "${page.metaTitle ?? ''}",
    "charCount": ${(page.metaTitle ?? '').length},
    "pixelEstimate": ${(page.metaTitle ?? '').length * 8},
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}],
    "suggestion": "Optimized title tag"
  },
  "descAnalysis": {
    "current": "${page.metaDesc ?? ''}",
    "charCount": ${(page.metaDesc ?? '').length},
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}],
    "suggestion": "Optimized meta description"
  },
  "contentAnalysis": {
    "wordCount": ${wordCount},
    "readabilityGrade": "Grade level",
    "avgSentenceLength": 15,
    "passiveVoicePercent": 10,
    "keywordDensity": "Assessment",
    "primaryKeyword": "detected keyword",
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}]
  },
  "headingStructure": {
    "h1Count": 1,
    "h2Count": 0,
    "h3Count": 0,
    "hierarchy": "H1 only",
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}],
    "suggestions": ["actionable fix"]
  },
  "keywordOptimization": {
    "primaryKeyword": "main keyword",
    "secondaryKeywords": ["secondary1", "secondary2"],
    "keywordInTitle": true,
    "keywordInH1": true,
    "keywordInFirst100Words": false,
    "keywordInSlug": false,
    "keywordInMetaDesc": false,
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}]
  },
  "internalLinking": {
    "estimatedLinks": 0,
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}],
    "suggestions": ["Add links to related pages"]
  },
  "urlSlugAnalysis": {
    "current": "/${page.slug}",
    "length": ${page.slug.length},
    "issues": [{"issue":"description","severity":"info","why":"SEO reason"}],
    "suggestion": "optimized-slug"
  },
  "readability": {
    "fleschScore": 60,
    "gradeLevel": "8th grade",
    "avgWordsPerSentence": 15,
    "complexWordPercent": 12,
    "issues": [{"issue":"description","severity":"info","why":"SEO reason"}]
  },
  "schemaMarkup": {
    "recommended": ["Article", "BreadcrumbList"],
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}]
  },
  "imageSeo": {
    "estimatedImages": 0,
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}],
    "suggestions": ["Add images with descriptive alt text"]
  },
  "mobileUx": {
    "issues": [{"issue":"description","severity":"info","why":"SEO reason"}],
    "suggestions": ["Ensure responsive design"]
  },
  "coreWebVitals": {
    "lcpRisk": "low",
    "clsRisk": "low",
    "fidRisk": "low",
    "issues": [{"issue":"description","severity":"info","why":"SEO reason"}]
  },
  "technicalSeo": {
    "canonicalNeeded": true,
    "openGraphComplete": false,
    "twitterCardReady": false,
    "robotsDirective": "index, follow",
    "issues": [{"issue":"description","severity":"warning","why":"SEO reason"}]
  },
  "quickWins": [
    {"action":"Do this","impact":"high","effort":"easy","why":"Because this directly affects ranking"}
  ],
  "competitiveInsights": {
    "estimatedDifficulty": "medium",
    "contentGaps": ["Missing topic coverage"],
    "differentiators": ["Unique angle"]
  }
}

Respond with ONLY the JSON object.`,
            },
        ], { temperature: 0, max_tokens: 4096 })
    } catch (aiErr: any) {
        console.error('[SEO Analysis] AI service failed:', aiErr.message)
        raw = ''
    }

    const fallbackIssue = { issue: 'Analysis incomplete', severity: 'info' as const, why: 'Could not fully analyze this aspect.' }
    const report = parseJson<SeoReport>(raw, {
        score: 0,
        grade: 'F',
        summary: raw === '' ? 'AI service is currently unavailable. Please check your API key and try again.' : 'Analysis failed — could not parse AI response.',
        titleAnalysis: { current: page.metaTitle ?? '', charCount: (page.metaTitle ?? '').length, pixelEstimate: (page.metaTitle ?? '').length * 8, issues: [fallbackIssue], suggestion: '' },
        descAnalysis: { current: page.metaDesc ?? '', charCount: (page.metaDesc ?? '').length, issues: [fallbackIssue], suggestion: '' },
        contentAnalysis: { wordCount, readabilityGrade: '', avgSentenceLength: 0, passiveVoicePercent: 0, keywordDensity: '', primaryKeyword: '', issues: [fallbackIssue] },
        headingStructure: { h1Count: 0, h2Count: 0, h3Count: 0, hierarchy: '', issues: [fallbackIssue], suggestions: [] },
        keywordOptimization: { primaryKeyword: '', secondaryKeywords: [], keywordInTitle: false, keywordInH1: false, keywordInFirst100Words: false, keywordInSlug: false, keywordInMetaDesc: false, issues: [fallbackIssue] },
        internalLinking: { estimatedLinks: 0, issues: [fallbackIssue], suggestions: [] },
        urlSlugAnalysis: { current: `/${page.slug}`, length: page.slug.length, issues: [fallbackIssue], suggestion: '' },
        readability: { fleschScore: 0, gradeLevel: '', avgWordsPerSentence: 0, complexWordPercent: 0, issues: [fallbackIssue] },
        schemaMarkup: { recommended: [], issues: [fallbackIssue] },
        imageSeo: { estimatedImages: 0, issues: [fallbackIssue], suggestions: [] },
        mobileUx: { issues: [fallbackIssue], suggestions: [] },
        coreWebVitals: { lcpRisk: 'medium', clsRisk: 'medium', fidRisk: 'medium', issues: [fallbackIssue] },
        technicalSeo: { canonicalNeeded: false, openGraphComplete: false, twitterCardReady: false, robotsDirective: '', issues: [fallbackIssue] },
        quickWins: [{ action: 'Run analysis again', impact: 'high', effort: 'easy', why: 'Initial analysis failed' }],
        competitiveInsights: { estimatedDifficulty: 'medium', contentGaps: [], differentiators: [] },
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

    let raw: string
    try {
        raw = await chat([
            {
                role: 'system',
                content: `You are a content freshness analyst. You MUST respond with ONLY a valid JSON object. No markdown code fences, no explanation text, no preamble — just the raw JSON object starting with { and ending with }.`,
            },
            {
                role: 'user',
                content: `Analyze the decay risk of this page and return ONLY valid JSON.

PAGE TITLE: ${page.title}
META TITLE: ${page.metaTitle ?? '(not set)'}
DAYS SINCE LAST UPDATE: ${daysSinceUpdate}
CONTENT:
${contentText.slice(0, 2000)}

Domain decay reference (months until typically stale):
${JSON.stringify(DOMAIN_DECAY_RATES, null, 2)}

IMPORTANT: Every array field MUST contain at least 1 item. Do NOT return empty arrays.

Return this exact JSON structure (replace placeholder values with real analysis):
{
  "score": 70,
  "domain": "general",
  "estimatedDecayMonths": 12,
  "daysUntilStale": 180,
  "riskLevel": "fresh",
  "reasons": ["Describe at least 1 specific decay risk signal"],
  "refreshSuggestions": ["Provide at least 1 concrete refresh action"],
  "topicsToUpdate": ["Name at least 1 specific section needing updates"]
}

Respond with ONLY the JSON object. No other text.`,
            },
        ], { temperature: 0 })
    } catch (aiErr: any) {
        console.error('[Decay Analysis] AI service failed:', aiErr.message)
        raw = ''
    }

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
        ...seo.quickWins.slice(0, 2).map(w => w.action),
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