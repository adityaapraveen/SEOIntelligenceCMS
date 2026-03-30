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
        <div className="text-center flex flex-col items-center gap-2">
            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${color}`}>
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
        <div className="border-t border-[var(--border-subtle)] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
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
            {open && <div className="mt-3 animate-fade-in">{children}</div>}
        </div>
    )
}

/* ─── Issue List ─────────────────────────────────── */
function IssueList({ items, type = 'issue' }: { items: string[]; type?: 'issue' | 'suggestion' | 'win' }) {
    if (!items.length) return <p className="text-xs text-[var(--text-muted)] italic">None found</p>
    const icons = {
        issue: <span className="text-red-400">✕</span>,
        suggestion: <span className="text-violet-400">→</span>,
        win: <span className="text-emerald-400">★</span>,
    }
    return (
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed">
                    <span className="shrink-0 mt-0.5">{icons[type]}</span>
                    {item}
                </li>
            ))}
        </ul>
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

    // AI analysis state
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

        // Save first so AI analyzes latest content
        try {
            const contentJson = JSON.stringify({
                blocks: content.split('\n\n').filter(Boolean).map(text => ({ type: 'paragraph', text }))
            })
            await api.patch(`/pages/${page.id}`, {
                content: contentJson,
                metaTitle: metaTitle || null,
                metaDesc: metaDesc || null,
            })
        } catch {
            // ignore save error, try analysis anyway
        }

        try {
            const { data } = await api.post(`/ai/pages/${page.id}/report`, {})
            setReport(data.report)
            setActiveTab('overview')
            // Update page scores from report
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

    async function applySuggestion(field: 'title' | 'desc', value: string) {
        if (field === 'title') setMeta(value)
        if (field === 'desc') setDesc(value)
    }

    function getScoreColor(score: number | null, type: 'seo' | 'decay') {
        if (score === null) return 'text-[var(--text-muted)] border-[var(--border-subtle)] bg-white/[0.02]'
        const thresholds = type === 'seo' ? { high: 80, mid: 60 } : { high: 70, mid: 40 }
        if (score >= thresholds.high) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
        if (score >= thresholds.mid) return 'text-amber-400 border-amber-500/20 bg-amber-500/5'
        return 'text-red-400 border-red-500/20 bg-red-500/5'
    }

    function gradeColor(grade: string) {
        return { A: 'text-emerald-400', B: 'text-lime-400', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400' }[grade] ?? 'text-zinc-400'
    }

    if (loading) return (
        <Layout>
            <div className="space-y-4 max-w-3xl">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-2xl skeleton" />)}
            </div>
        </Layout>
    )

    if (!page) return <Layout><p className="text-[var(--text-muted)]">Page not found.</p></Layout>

    return (
        <Layout>
            {/* Editor header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-semibold text-white">{page.title}</h1>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-1">/{page.site.slug}/{page.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Saved
                        </span>
                    )}
                    <Badge variant={page.publishedAt ? 'success' : 'default'}>
                        {page.publishedAt ? 'Live' : 'Draft'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={togglePublish}>
                        {page.publishedAt ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button onClick={savePage} loading={saving} size="sm">
                        Save
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Content editor */}
                <div className="lg:col-span-2 flex flex-col gap-4 animate-fade-in">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Content
                        </label>
                        <textarea
                            className="w-full min-h-[500px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/40 focus:ring-2 focus:ring-[var(--accent-violet)]/10 resize-none font-mono leading-relaxed transition-all duration-200 hover:border-[var(--border-default)]"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Start writing your content..."
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    {/* Meta */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col gap-4">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            SEO metadata
                        </h3>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[var(--text-muted)] flex justify-between">
                                <span>Meta title</span>
                                <span className={`font-mono ${metaTitle.length > 55 ? 'text-amber-400' : ''}`}>{metaTitle.length}/60</span>
                            </label>
                            <input
                                className="w-full bg-white/[0.04] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all duration-200 hover:border-[var(--border-hover)]"
                                value={metaTitle} maxLength={60}
                                onChange={e => setMeta(e.target.value)}
                                placeholder="Page title for search engines"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-[var(--text-muted)] flex justify-between">
                                <span>Meta description</span>
                                <span className={`font-mono ${metaDesc.length > 140 ? 'text-amber-400' : ''}`}>{metaDesc.length}/160</span>
                            </label>
                            <textarea
                                className="w-full bg-white/[0.04] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10 resize-none transition-all duration-200 hover:border-[var(--border-hover)]"
                                rows={3} value={metaDesc} maxLength={160}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="Brief description for search results"
                            />
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-5 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Scores
                        </h3>
                        <div className="flex justify-around">
                            <ScoreRing label="SEO" value={page.seoScore ?? '—'} color={getScoreColor(page.seoScore, 'seo')} />
                            <div className="w-px bg-[var(--border-subtle)]" />
                            <ScoreRing label="Freshness" value={page.decayScore ?? '—'} color={getScoreColor(page.decayScore, 'decay')} />
                        </div>
                    </div>

                    {/* AI Analysis Panel */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-5">
                        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-[var(--accent-violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI analysis
                        </h3>

                        {!report && !analyzing && (
                            <>
                                <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                                    Get AI-powered SEO score, content freshness analysis, and specific suggestions to improve your page's ranking.
                                </p>
                                {aiError && (
                                    <div className="mb-3 px-3 py-2 bg-red-500/8 border border-red-500/15 rounded-xl text-xs text-red-400">
                                        {aiError}
                                    </div>
                                )}
                                <Button variant="primary" size="sm" className="w-full" onClick={runAnalysis}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Run AI analysis
                                </Button>
                            </>
                        )}

                        {analyzing && (
                            <div className="flex flex-col items-center gap-3 py-6">
                                <div className="w-8 h-8 border-2 border-[var(--accent-violet)] border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-[var(--text-muted)]">Analyzing content...</p>
                                <p className="text-[10px] text-[var(--text-muted)]">This may take 15-30 seconds</p>
                            </div>
                        )}

                        {report && !analyzing && (
                            <div className="animate-fade-in">
                                {/* Overall Score */}
                                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/[0.02] border border-[var(--border-subtle)]">
                                    <div className={`text-2xl font-bold ${getScoreColor(report.overallScore, 'seo').split(' ')[0]}`}>
                                        {report.overallScore}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-white">Overall Score</p>
                                        <p className="text-[10px] text-[var(--text-muted)]">
                                            {report.publishReady
                                                ? '✓ Publish ready'
                                                : '✕ Needs improvement before publishing'}
                                        </p>
                                    </div>
                                    <Badge variant={report.publishReady ? 'success' : 'warning'}>
                                        {report.seo.grade}
                                    </Badge>
                                </div>

                                {/* Tab bar */}
                                <div className="flex gap-1 mb-4 p-1 bg-white/[0.02] rounded-xl">
                                    {(['overview', 'seo', 'decay'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex-1 text-[11px] font-medium py-1.5 px-2 rounded-lg transition-all cursor-pointer ${activeTab === tab
                                                ? 'bg-[var(--accent-violet)]/15 text-[var(--accent-violet)]'
                                                : 'text-[var(--text-muted)] hover:text-white'
                                                }`}
                                        >
                                            {tab === 'overview' ? 'Overview' : tab === 'seo' ? 'SEO' : 'Freshness'}
                                        </button>
                                    ))}
                                </div>

                                {/* Overview tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-0">
                                        <Section
                                            title="Top priorities"
                                            icon={<span className="text-amber-400">⚡</span>}
                                            defaultOpen={true}
                                        >
                                            <IssueList items={report.topPriorities} type="win" />
                                        </Section>
                                        <Section
                                            title="Quick wins"
                                            icon={<span className="text-emerald-400">🎯</span>}
                                        >
                                            <IssueList items={report.seo.quickWins} type="win" />
                                        </Section>
                                        <Section
                                            title="Summary"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                        >
                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{report.seo.summary}</p>
                                        </Section>
                                    </div>
                                )}

                                {/* SEO tab */}
                                {activeTab === 'seo' && (
                                    <div className="space-y-0">
                                        {/* Title analysis */}
                                        <Section
                                            title="Title tag"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                                            defaultOpen={true}
                                        >
                                            <div className="space-y-2">
                                                <IssueList items={report.seo.titleAnalysis.issues} type="issue" />
                                                {report.seo.titleAnalysis.suggestion && (
                                                    <div className="mt-2 p-2.5 bg-violet-500/5 border border-violet-500/15 rounded-lg">
                                                        <p className="text-[10px] text-violet-400 font-medium mb-1">AI suggestion:</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">"{report.seo.titleAnalysis.suggestion}"</p>
                                                        <button
                                                            onClick={() => applySuggestion('title', report.seo.titleAnalysis.suggestion)}
                                                            className="mt-2 text-[10px] text-[var(--accent-violet)] hover:text-[var(--accent-violet-hover)] font-medium transition-colors cursor-pointer"
                                                        >
                                                            ↑ Apply this suggestion
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </Section>

                                        {/* Meta description */}
                                        <Section
                                            title="Meta description"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>}
                                        >
                                            <div className="space-y-2">
                                                <IssueList items={report.seo.descAnalysis.issues} type="issue" />
                                                {report.seo.descAnalysis.suggestion && (
                                                    <div className="mt-2 p-2.5 bg-violet-500/5 border border-violet-500/15 rounded-lg">
                                                        <p className="text-[10px] text-violet-400 font-medium mb-1">AI suggestion:</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">"{report.seo.descAnalysis.suggestion}"</p>
                                                        <button
                                                            onClick={() => applySuggestion('desc', report.seo.descAnalysis.suggestion)}
                                                            className="mt-2 text-[10px] text-[var(--accent-violet)] hover:text-[var(--accent-violet-hover)] font-medium transition-colors cursor-pointer"
                                                        >
                                                            ↑ Apply this suggestion
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </Section>

                                        {/* Content analysis */}
                                        <Section
                                            title="Content analysis"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                        >
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="p-2 bg-white/[0.02] rounded-lg text-center">
                                                        <p className="text-xs font-semibold text-white">{report.seo.contentAnalysis.wordCount}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)]">words</p>
                                                    </div>
                                                    <div className="p-2 bg-white/[0.02] rounded-lg text-center">
                                                        <p className="text-xs font-semibold text-white">{report.seo.contentAnalysis.readability}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)]">readability</p>
                                                    </div>
                                                    <div className="p-2 bg-white/[0.02] rounded-lg text-center">
                                                        <p className="text-[10px] font-semibold text-white truncate">{report.seo.contentAnalysis.keywordDensity}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)]">keywords</p>
                                                    </div>
                                                </div>
                                                <IssueList items={report.seo.contentAnalysis.issues} type="issue" />
                                            </div>
                                        </Section>

                                        {/* Structure */}
                                        <Section
                                            title="Structure"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>}
                                        >
                                            <div className="space-y-3">
                                                <IssueList items={report.seo.structureAnalysis.issues} type="issue" />
                                                {report.seo.structureAnalysis.suggestions.length > 0 && (
                                                    <>
                                                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mt-2">Suggestions</p>
                                                        <IssueList items={report.seo.structureAnalysis.suggestions} type="suggestion" />
                                                    </>
                                                )}
                                            </div>
                                        </Section>
                                    </div>
                                )}

                                {/* Decay tab */}
                                {activeTab === 'decay' && (
                                    <div className="space-y-0">
                                        <Section
                                            title="Freshness overview"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            defaultOpen={true}
                                        >
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 bg-white/[0.02] rounded-lg">
                                                        <p className="text-[10px] text-[var(--text-muted)]">Domain</p>
                                                        <p className="text-xs font-semibold text-white capitalize">{report.decay.domain}</p>
                                                    </div>
                                                    <div className="p-2.5 bg-white/[0.02] rounded-lg">
                                                        <p className="text-[10px] text-[var(--text-muted)]">Risk level</p>
                                                        <p className={`text-xs font-semibold capitalize ${report.decay.riskLevel === 'fresh' ? 'text-emerald-400'
                                                            : report.decay.riskLevel === 'aging' ? 'text-amber-400'
                                                                : report.decay.riskLevel === 'stale' ? 'text-orange-400'
                                                                    : 'text-red-400'
                                                            }`}>{report.decay.riskLevel}</p>
                                                    </div>
                                                    <div className="p-2.5 bg-white/[0.02] rounded-lg">
                                                        <p className="text-[10px] text-[var(--text-muted)]">Decay rate</p>
                                                        <p className="text-xs font-semibold text-white">{report.decay.estimatedDecayMonths} months</p>
                                                    </div>
                                                    <div className="p-2.5 bg-white/[0.02] rounded-lg">
                                                        <p className="text-[10px] text-[var(--text-muted)]">Stale in</p>
                                                        <p className="text-xs font-semibold text-white">{report.decay.daysUntilStale} days</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Section>

                                        <Section
                                            title="Decay signals"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
                                        >
                                            <IssueList items={report.decay.reasons} type="issue" />
                                        </Section>

                                        <Section
                                            title="Refresh suggestions"
                                            icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                                        >
                                            <IssueList items={report.decay.refreshSuggestions} type="suggestion" />
                                        </Section>

                                        {report.decay.topicsToUpdate.length > 0 && (
                                            <Section
                                                title="Topics to update"
                                                icon={<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
                                            >
                                                <IssueList items={report.decay.topicsToUpdate} type="suggestion" />
                                            </Section>
                                        )}
                                    </div>
                                )}

                                {/* Re-run button */}
                                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                                    <Button variant="ghost" size="sm" className="w-full" onClick={runAnalysis}>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Re-analyze
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] text-center mt-1">
                        Last saved {timeAgo(page.updatedAt)}
                    </p>
                </div>
            </div>
        </Layout>
    )
}