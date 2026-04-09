import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { timeAgo } from '../lib/utils'

interface Page {
    id: string; title: string; slug: string
    content: string; metaTitle: string | null; metaDesc: string | null
    seoScore: number | null; decayScore: number | null
    publishedAt: string | null; updatedAt: string
    site: { name: string; slug: string }
}

interface SeoReport {
    score: number; grade: string; summary: string
    titleAnalysis: { current: string; issues: string[]; suggestion: string }
    descAnalysis: { current: string; issues: string[]; suggestion: string }
    contentAnalysis: { wordCount: number; readability: string; keywordDensity: string; issues: string[] }
    structureAnalysis: { issues: string[]; suggestions: string[] }
    quickWins: string[]
}

interface DecayReport {
    score: number; domain: string; estimatedDecayMonths: number
    daysUntilStale: number; riskLevel: string
    reasons: string[]; refreshSuggestions: string[]; topicsToUpdate: string[]
}

interface UnifiedReport {
    overallScore: number; publishReady: boolean
    seo: SeoReport; decay: DecayReport
    topPriorities: string[]
    semanticDiff: any | null
}

/* ─── Score Ring ─────────────────────────────────── */
function ScoreRing({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <div className="text-center flex flex-col items-center gap-2.5">
            <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center ${color}`}>
                <span className="text-xl font-bold">{value}</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{label}</p>
        </div>
    )
}

/* ─── Collapsible Section ────────────────────────── */
function Section({ title, icon, children, defaultOpen = false }: {
    title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border-t border-[var(--border-subtle)] pt-5 mt-5 first:border-0 first:pt-0 first:mt-0">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    {icon}
                    {title}
                </span>
                <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="mt-4 animate-fade-in">{children}</div>}
        </div>
    )
}

/* ─── Issue List ─────────────────────────────────── */
function IssueList({ items, type = 'issue' }: { items: string[]; type?: 'issue' | 'suggestion' | 'win' }) {
    if (!items.length) return <p className="text-xs text-[var(--text-muted)] italic">None found</p>
    const icons = {
        issue: <span className="text-red-400 text-sm">✕</span>,
        suggestion: <span className="text-violet-400 text-sm">→</span>,
        win: <span className="text-emerald-400 text-sm">★</span>,
    }
    return (
        <ul className="space-y-2.5">
            {items.map((item, i) => (
                <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2.5 leading-relaxed">
                    <span className="shrink-0 mt-0.5">{icons[type]}</span>
                    {item}
                </li>
            ))}
        </ul>
    )
}

/* ─── SEO Checklist ─────────────────────────────── */
function SeoChecklist({ metaTitle, metaDesc, content, slug, isPublished }: {
    metaTitle: string; metaDesc: string; content: string; slug: string; isPublished: boolean
}) {
    const wordCount = content.split(/\s+/).filter(Boolean).length
    const checks = [
        { label: 'Meta title set', pass: metaTitle.length > 0 },
        { label: 'Title length (30-60 chars)', pass: metaTitle.length >= 30 && metaTitle.length <= 60, warn: metaTitle.length > 0 && (metaTitle.length < 30 || metaTitle.length > 60) },
        { label: 'Meta description set', pass: metaDesc.length > 0 },
        { label: 'Description (70-160 chars)', pass: metaDesc.length >= 70 && metaDesc.length <= 160, warn: metaDesc.length > 0 && (metaDesc.length < 70 || metaDesc.length > 160) },
        { label: 'Content has substance (300+ words)', pass: wordCount >= 300, warn: wordCount >= 100 && wordCount < 300 },
        { label: 'SEO-friendly slug', pass: /^[a-z0-9-]+$/.test(slug) && slug.length <= 60 },
        { label: 'Page is published', pass: isPublished },
    ]

    const passCount = checks.filter(c => c.pass).length

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Checklist</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${passCount === checks.length ? 'text-emerald-400 bg-emerald-500/8' : passCount >= 5 ? 'text-amber-400 bg-amber-500/8' : 'text-red-400 bg-red-500/8'}`}>
                    {passCount}/{checks.length}
                </span>
            </div>
            <div className="space-y-1">
                {checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                        {check.pass ? (
                            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : check.warn ? (
                            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span className={`text-xs ${check.pass ? 'text-[var(--text-secondary)]' : check.warn ? 'text-amber-400/80' : 'text-[var(--text-muted)]'}`}>
                            {check.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─── Main Editor ────────────────────────────────── */
export default function EditorPage() {
    const { pageId } = useParams()
    const [page, setPage] = useState<Page | null>(null)
    const [content, setContent] = useState('')
    const [metaTitle, setMeta] = useState('')
    const [metaDesc, setDesc] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)

    const [analyzing, setAnalyzing] = useState(false)
    const [report, setReport] = useState<UnifiedReport | null>(null)
    const [aiError, setAiError] = useState('')
    const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'decay'>('overview')

    useEffect(() => { fetchPage() }, [pageId])

    async function fetchPage() {
        try {
            const { data } = await api.get(`/pages/${pageId}`)
            setPage(data.page)
            try {
                const parsed = JSON.parse(data.page.content)
                const text = parsed.blocks?.map((b: any) => b.text ?? '').join('\n\n') ?? data.page.content
                setContent(text)
            } catch { setContent(data.page.content) }
            setMeta(data.page.metaTitle ?? '')
            setDesc(data.page.metaDesc ?? '')
        } finally { setLoading(false) }
    }

    async function savePage() {
        if (!page) return
        setSaving(true)
        try {
            const contentJson = JSON.stringify({
                blocks: content.split('\n\n').filter(Boolean).map(text => ({ type: 'paragraph', text }))
            })
            const { data } = await api.patch(`/pages/${page.id}`, {
                content: contentJson,
                metaTitle: metaTitle || null,
                metaDesc: metaDesc || null,
            })
            setPage(prev => prev ? { ...prev, ...data.page } : null)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } finally { setSaving(false) }
    }

    async function togglePublish() {
        if (!page) return
        const endpoint = page.publishedAt ? 'unpublish' : 'publish'
        const { data } = await api.post(`/pages/${page.id}/${endpoint}`)
        setPage(prev => prev ? { ...prev, publishedAt: data.page.publishedAt } : null)
    }

    async function runAnalysis() {
        if (!page) return
        setAnalyzing(true)
        setAiError('')
        setReport(null)

        try {
            const contentJson = JSON.stringify({
                blocks: content.split('\n\n').filter(Boolean).map(text => ({ type: 'paragraph', text }))
            })
            await api.patch(`/pages/${page.id}`, {
                content: contentJson,
                metaTitle: metaTitle || null,
                metaDesc: metaDesc || null,
            })
        } catch { /* ignore */ }

        try {
            const { data } = await api.post(`/ai/pages/${page.id}/report`, {})
            setReport(data.report)
            setActiveTab('overview')
            if (data.report.seo?.score !== undefined) {
                setPage(prev => prev ? {
                    ...prev,
                    seoScore: data.report.seo.score,
                    decayScore: data.report.decay.score,
                } : null)
            }
        } catch (err: any) {
            setAiError(err.response?.data?.error ?? 'AI analysis failed. Please try again.')
        } finally {
            setAnalyzing(false)
        }
    }

    function applySuggestion(field: 'title' | 'desc', value: string) {
        if (field === 'title') setMeta(value)
        if (field === 'desc') setDesc(value)
    }

    function getScoreColor(score: number | null, type: 'seo' | 'decay') {
        if (score === null) return 'text-[var(--text-muted)] border-[var(--border-subtle)] bg-white/[0.015]'
        const thresholds = type === 'seo' ? { high: 80, mid: 60 } : { high: 70, mid: 40 }
        if (score >= thresholds.high) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
        if (score >= thresholds.mid) return 'text-amber-400 border-amber-500/20 bg-amber-500/5'
        return 'text-red-400 border-red-500/20 bg-red-500/5'
    }

    if (loading) return (
        <Layout>
            <div className="space-y-5 max-w-3xl">
                {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-2xl skeleton" />)}
            </div>
        </Layout>
    )

    if (!page) return <Layout><p className="text-[var(--text-muted)]">Page not found.</p></Layout>

    const publicUrl = `/p/${page.site.slug}/${page.slug}`
    const wordCount = content.split(/\s+/).filter(Boolean).length

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">{page.title}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-xs text-[var(--text-muted)] font-mono">/{page.site.slug}/{page.slug}</p>
                        {page.publishedAt && (
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--accent-violet)] hover:text-[var(--accent-violet-hover)] font-medium flex items-center gap-1.5 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View live page
                            </a>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Saved
                        </span>
                    )}
                    <Badge variant={page.publishedAt ? 'success' : 'default'}>
                        {page.publishedAt ? 'Live' : 'Draft'}
                    </Badge>
                    <Button variant="ghost" onClick={togglePublish}>
                        {page.publishedAt ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button onClick={savePage} loading={saving}>
                        Save changes
                    </Button>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

                {/* ─── Left: Content Editor ─── */}
                <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Editor */}
                    <div>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2 mb-3">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Content
                        </label>
                        <textarea
                            className="w-full min-h-[560px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-6 py-5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 resize-none font-mono leading-[1.8] transition-all duration-200 hover:border-[var(--border-default)]"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Start writing your content..."
                        />
                        {/* Word count */}
                        <div className="flex items-center justify-between mt-3 px-1">
                            <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                {wordCount} words · {content.length} chars
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                                Last saved {timeAgo(page.updatedAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── Right: Sidebar ─── */}
                <div className="flex flex-col gap-6 animate-fade-in" style={{ animationDelay: '100ms' }}>

                    {/* SEO Metadata */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2 mb-5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            SEO Metadata
                        </h3>
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-[var(--text-muted)] flex justify-between">
                                    <span>Meta title</span>
                                    <span className={`font-mono text-[11px] ${metaTitle.length > 55 ? 'text-amber-400' : ''}`}>{metaTitle.length}/60</span>
                                </label>
                                <input
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all hover:border-[var(--border-hover)]"
                                    value={metaTitle} maxLength={60}
                                    onChange={e => setMeta(e.target.value)}
                                    placeholder="Page title for search engines"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-[var(--text-muted)] flex justify-between">
                                    <span>Meta description</span>
                                    <span className={`font-mono text-[11px] ${metaDesc.length > 140 ? 'text-amber-400' : ''}`}>{metaDesc.length}/160</span>
                                </label>
                                <textarea
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 resize-none transition-all hover:border-[var(--border-hover)]"
                                    rows={3} value={metaDesc} maxLength={160}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Brief description for search results"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SERP Preview */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Google Preview
                        </h3>
                        <div className="p-4 rounded-xl bg-white/[0.015] border border-[var(--border-subtle)]">
                            <p className="text-xs text-emerald-400/70 font-mono truncate mb-1">
                                example.com › {page.site.slug} › {page.slug}
                            </p>
                            <p className="text-sm text-blue-400 font-medium truncate mb-1.5 hover:underline cursor-default leading-snug">
                                {metaTitle || page.title || 'Untitled page'}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                                {metaDesc || 'No description set. Add a meta description to improve click-through rates from search results.'}
                            </p>
                        </div>
                    </div>

                    {/* SEO Checklist */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            SEO Checklist
                        </h3>
                        <SeoChecklist
                            metaTitle={metaTitle}
                            metaDesc={metaDesc}
                            content={content}
                            slug={page.slug}
                            isPublished={!!page.publishedAt}
                        />
                    </div>

                    {/* Scores */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-5 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Scores
                        </h3>
                        <div className="flex justify-around py-2">
                            <ScoreRing label="SEO" value={page.seoScore ?? '—'} color={getScoreColor(page.seoScore, 'seo')} />
                            <div className="w-px bg-[var(--border-subtle)]" />
                            <ScoreRing label="Freshness" value={page.decayScore ?? '—'} color={getScoreColor(page.decayScore, 'decay')} />
                        </div>
                    </div>

                    {/* AI Analysis */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-[var(--accent-violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Analysis
                        </h3>

                        {!report && !analyzing && (
                            <>
                                <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
                                    Get AI-powered SEO analysis, content freshness scoring, and actionable suggestions to improve your rankings.
                                </p>
                                {aiError && (
                                    <div className="mb-4 px-4 py-3 bg-red-500/8 border border-red-500/12 rounded-xl text-xs text-red-400">
                                        {aiError}
                                    </div>
                                )}
                                <Button variant="primary" className="w-full" onClick={runAnalysis}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Run AI Analysis
                                </Button>
                            </>
                        )}

                        {analyzing && (
                            <div className="flex flex-col items-center gap-3 py-8">
                                <div className="w-8 h-8 border-2 border-[var(--accent-violet)] border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-[var(--text-muted)]">Analyzing content...</p>
                                <p className="text-[11px] text-[var(--text-muted)]">This may take 15-30 seconds</p>
                            </div>
                        )}

                        {report && !analyzing && (
                            <div className="animate-fade-in">
                                {/* Overall Score */}
                                <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-white/[0.02] border border-[var(--border-subtle)]">
                                    <div className={`text-2xl font-bold ${getScoreColor(report.overallScore, 'seo').split(' ')[0]}`}>
                                        {report.overallScore}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-white">Overall Score</p>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                            {report.publishReady ? '✓ Publish ready' : '✕ Needs improvement'}
                                        </p>
                                    </div>
                                    <Badge variant={report.publishReady ? 'success' : 'warning'}>
                                        {report.seo.grade}
                                    </Badge>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-1 mb-5 p-1 bg-white/[0.02] rounded-xl border border-[var(--border-subtle)]">
                                    {(['overview', 'seo', 'decay'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg transition-all cursor-pointer ${activeTab === tab
                                                ? 'bg-[var(--accent-violet)]/15 text-[var(--accent-violet)]'
                                                : 'text-[var(--text-muted)] hover:text-white'
                                                }`}
                                        >
                                            {tab === 'overview' ? 'Overview' : tab === 'seo' ? 'SEO' : 'Freshness'}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                {activeTab === 'overview' && (
                                    <div>
                                        <Section title="Top priorities" icon={<span className="text-amber-400">⚡</span>} defaultOpen={true}>
                                            <IssueList items={report.topPriorities} type="win" />
                                        </Section>
                                        <Section title="Quick wins" icon={<span className="text-emerald-400">🎯</span>}>
                                            <IssueList items={report.seo.quickWins} type="win" />
                                        </Section>
                                        <Section title="Summary" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{report.seo.summary}</p>
                                        </Section>
                                    </div>
                                )}

                                {activeTab === 'seo' && (
                                    <div>
                                        <Section title="Title tag" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} defaultOpen={true}>
                                            <div className="space-y-3">
                                                <IssueList items={report.seo.titleAnalysis.issues} type="issue" />
                                                {report.seo.titleAnalysis.suggestion && (
                                                    <div className="p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                                                        <p className="text-[11px] text-violet-400 font-semibold mb-1.5">AI suggestion:</p>
                                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">"{report.seo.titleAnalysis.suggestion}"</p>
                                                        <button
                                                            onClick={() => applySuggestion('title', report.seo.titleAnalysis.suggestion)}
                                                            className="mt-3 text-xs text-[var(--accent-violet)] hover:text-[var(--accent-violet-hover)] font-semibold transition-colors cursor-pointer"
                                                        >
                                                            ↑ Apply this suggestion
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </Section>

                                        <Section title="Meta description" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>}>
                                            <div className="space-y-3">
                                                <IssueList items={report.seo.descAnalysis.issues} type="issue" />
                                                {report.seo.descAnalysis.suggestion && (
                                                    <div className="p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                                                        <p className="text-[11px] text-violet-400 font-semibold mb-1.5">AI suggestion:</p>
                                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">"{report.seo.descAnalysis.suggestion}"</p>
                                                        <button
                                                            onClick={() => applySuggestion('desc', report.seo.descAnalysis.suggestion)}
                                                            className="mt-3 text-xs text-[var(--accent-violet)] hover:text-[var(--accent-violet-hover)] font-semibold transition-colors cursor-pointer"
                                                        >
                                                            ↑ Apply this suggestion
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </Section>

                                        <Section title="Content analysis" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                                                        <p className="text-sm font-bold text-white">{report.seo.contentAnalysis.wordCount}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">words</p>
                                                    </div>
                                                    <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                                                        <p className="text-sm font-bold text-white">{report.seo.contentAnalysis.readability}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">readability</p>
                                                    </div>
                                                    <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                                                        <p className="text-xs font-bold text-white truncate">{report.seo.contentAnalysis.keywordDensity}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">keywords</p>
                                                    </div>
                                                </div>
                                                <IssueList items={report.seo.contentAnalysis.issues} type="issue" />
                                            </div>
                                        </Section>

                                        <Section title="Structure" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>}>
                                            <div className="space-y-4">
                                                <IssueList items={report.seo.structureAnalysis.issues} type="issue" />
                                                {report.seo.structureAnalysis.suggestions.length > 0 && (
                                                    <>
                                                        <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Suggestions</p>
                                                        <IssueList items={report.seo.structureAnalysis.suggestions} type="suggestion" />
                                                    </>
                                                )}
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {activeTab === 'decay' && (
                                    <div>
                                        <Section title="Freshness overview" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} defaultOpen={true}>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3.5 bg-white/[0.02] rounded-xl">
                                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Domain</p>
                                                    <p className="text-xs font-bold text-white capitalize">{report.decay.domain}</p>
                                                </div>
                                                <div className="p-3.5 bg-white/[0.02] rounded-xl">
                                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Risk level</p>
                                                    <p className={`text-xs font-bold capitalize ${report.decay.riskLevel === 'fresh' ? 'text-emerald-400' : report.decay.riskLevel === 'aging' ? 'text-amber-400' : report.decay.riskLevel === 'stale' ? 'text-orange-400' : 'text-red-400'}`}>{report.decay.riskLevel}</p>
                                                </div>
                                                <div className="p-3.5 bg-white/[0.02] rounded-xl">
                                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Decay rate</p>
                                                    <p className="text-xs font-bold text-white">{report.decay.estimatedDecayMonths} months</p>
                                                </div>
                                                <div className="p-3.5 bg-white/[0.02] rounded-xl">
                                                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Stale in</p>
                                                    <p className="text-xs font-bold text-white">{report.decay.daysUntilStale} days</p>
                                                </div>
                                            </div>
                                        </Section>
                                        <Section title="Decay signals" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}>
                                            <IssueList items={report.decay.reasons} type="issue" />
                                        </Section>
                                        <Section title="Refresh suggestions" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
                                            <IssueList items={report.decay.refreshSuggestions} type="suggestion" />
                                        </Section>
                                        {report.decay.topicsToUpdate.length > 0 && (
                                            <Section title="Topics to update" icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}>
                                                <IssueList items={report.decay.topicsToUpdate} type="suggestion" />
                                            </Section>
                                        )}
                                    </div>
                                )}

                                {/* Re-run */}
                                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
                                    <Button variant="ghost" className="w-full" onClick={runAnalysis}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Re-analyze
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    )
}