import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { timeAgo } from '../lib/utils'

interface Page {
    id: string; title: string; slug: string
    seoScore: number | null; decayScore: number | null
    publishedAt: string | null; updatedAt: string
}
interface Site { id: string; name: string; slug: string; pages: Page[] }

function ScorePill({ label, score }: { label: string; score: number | null }) {
    if (score === null) return null
    const color = score >= 80
        ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/12'
        : score >= 60
            ? 'text-amber-400 bg-amber-500/8 border-amber-500/12'
            : 'text-red-400 bg-red-500/8 border-red-500/12'

    return (
        <div className="text-right">
            <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase tracking-wider font-medium">{label}</p>
            <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-lg border ${color}`}>
                {score}
            </span>
        </div>
    )
}

export default function SitePage() {
    const { siteId } = useParams()
    const navigate = useNavigate()
    const [site, setSite] = useState<Site | null>(null)
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [creating, setCreating] = useState(false)
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [error, setError] = useState('')

    useEffect(() => { fetchSite() }, [siteId])

    async function fetchSite() {
        try {
            const { data } = await api.get(`/sites/${siteId}`)
            setSite(data.site)
        } finally { setLoading(false) }
    }

    function slugify(v: string) {
        return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }

    async function createPage(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setCreating(true)
        try {
            const { data } = await api.post(`/pages?siteId=${siteId}`, { title, slug })
            navigate(`/sites/${siteId}/pages/${data.page.id}`)
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Failed to create page')
            setCreating(false)
        }
    }

    if (loading) return (
        <Layout>
            <div className="space-y-4 max-w-4xl">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}
            </div>
        </Layout>
    )

    if (!site) return <Layout><p className="text-[var(--text-muted)]">Site not found.</p></Layout>

    const publishedCount = site.pages.filter(p => p.publishedAt).length
    const scoredPages = site.pages.filter(p => p.seoScore !== null)
    const avgSeo = scoredPages.length > 0
        ? Math.round(scoredPages.reduce((s, p) => s + (p.seoScore ?? 0), 0) / scoredPages.length)
        : 0

    return (
        <Layout>
            {/* Page header */}
            <div className="flex items-start justify-between mb-10">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500/15 to-violet-600/10 border border-violet-500/10 rounded-xl flex items-center justify-center mt-0.5">
                        <span className="text-violet-400 font-bold text-lg">{site.name[0].toUpperCase()}</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{site.name}</h1>
                        <p className="text-sm text-[var(--text-muted)] font-mono mt-1">/{site.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {site.pages.some(p => p.publishedAt) && (
                        <a
                            href={`/p/${site.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-xl hover:bg-white/[0.04] hover:text-white hover:border-[var(--border-hover)] transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View live site
                        </a>
                    )}
                    <Button onClick={() => setShowForm(v => !v)}>
                        {showForm ? 'Cancel' : (
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New page
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            {site.pages.length > 0 && (
                <div className="flex gap-4 mb-8 animate-fade-in">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                        <span className="text-sm text-[var(--text-muted)]">Pages</span>
                        <span className="text-sm font-bold text-white">{site.pages.length}</span>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                        <span className="text-sm text-[var(--text-muted)]">Published</span>
                        <span className="text-sm font-bold text-emerald-400">{publishedCount}</span>
                    </div>
                    {avgSeo > 0 && (
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                            <span className="text-sm text-[var(--text-muted)]">Avg SEO</span>
                            <span className={`text-sm font-bold ${avgSeo >= 80 ? 'text-emerald-400' : avgSeo >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{avgSeo}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Create form */}
            {showForm && (
                <div className="mb-8 animate-scale-in">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-[var(--shadow-elevated)]">
                        <form onSubmit={createPage} className="flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-violet-500/15 rounded-xl flex items-center justify-center">
                                    <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <h2 className="text-base font-semibold text-white">Create new page</h2>
                            </div>
                            {error && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/12 rounded-xl px-5 py-3">{error}</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Page title</label>
                                    <input className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all hover:border-[var(--border-hover)]"
                                        value={title} placeholder="About Us"
                                        onChange={e => { setTitle(e.target.value); setSlug(slugify(e.target.value)) }} required />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">URL slug</label>
                                    <input className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all font-mono hover:border-[var(--border-hover)]"
                                        value={slug} placeholder="about-us"
                                        onChange={e => setSlug(slugify(e.target.value))} required />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" loading={creating}>Create page</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Page list */}
            {site.pages.length === 0 ? (
                <div className="text-center py-32 animate-fade-in">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-violet)]/10 to-violet-600/5 border border-[var(--border-subtle)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-7 h-7 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">No pages yet</p>
                    <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto leading-relaxed">Create your first page to start writing and optimizing content.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {site.pages.map((page, i) => (
                        <div key={page.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                            <Card onClick={() => navigate(`/sites/${siteId}/pages/${page.id}`)}>
                                <div className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/8 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-violet-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-white text-sm truncate">{page.title}</p>
                                            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">/{page.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 shrink-0 ml-6">
                                        <ScorePill label="SEO" score={page.seoScore} />
                                        <ScorePill label="Fresh" score={page.decayScore} />
                                        <Badge variant={page.publishedAt ? 'success' : 'default'}>
                                            {page.publishedAt ? 'Live' : 'Draft'}
                                        </Badge>
                                        <span className="text-xs text-[var(--text-muted)] hidden sm:inline min-w-[60px] text-right">{timeAgo(page.updatedAt)}</span>
                                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    )
}