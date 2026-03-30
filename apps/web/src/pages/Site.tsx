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
        ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/15'
        : score >= 60
            ? 'text-amber-400 bg-amber-500/8 border-amber-500/15'
            : 'text-red-400 bg-red-500/8 border-red-500/15'

    return (
        <div className="text-right">
            <p className="text-[10px] text-[var(--text-muted)] mb-0.5 uppercase tracking-wider">{label}</p>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md border ${color}`}>
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
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}
            </div>
        </Layout>
    )

    if (!site) return <Layout><p className="text-[var(--text-muted)]">Site not found.</p></Layout>

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-white">{site.name}</h1>
                    <p className="text-sm text-[var(--text-muted)] font-mono mt-1.5">/{site.slug}</p>
                </div>
                <Button onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Cancel' : (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New page
                        </span>
                    )}
                </Button>
            </div>

            {showForm && (
                <div className="mb-6 animate-fade-in-scale">
                    <Card>
                        <form onSubmit={createPage} className="flex flex-col gap-5">
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                <div className="w-5 h-5 bg-[var(--accent-violet)]/20 rounded-md flex items-center justify-center">
                                    <svg className="w-3 h-3 text-[var(--accent-violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                New page
                            </h2>
                            {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5">{error}</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">Title</label>
                                    <input className="bg-white/[0.04] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all duration-200 hover:border-[var(--border-hover)]"
                                        value={title} placeholder="About Us"
                                        onChange={e => { setTitle(e.target.value); setSlug(slugify(e.target.value)) }} required />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">Slug</label>
                                    <input className="bg-white/[0.04] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all duration-200 font-mono hover:border-[var(--border-hover)]"
                                        value={slug} placeholder="about-us"
                                        onChange={e => setSlug(slugify(e.target.value))} required />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" loading={creating}>Create page</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {site.pages.length === 0 ? (
                <div className="text-center py-28 animate-fade-in">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-violet)]/10 to-violet-600/5 border border-[var(--border-subtle)] rounded-3xl flex items-center justify-center mx-auto mb-5">
                        <svg className="w-7 h-7 text-[var(--accent-violet)]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-white font-medium text-base">No pages yet</p>
                    <p className="text-[var(--text-muted)] text-sm mt-1.5">Create your first page</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {site.pages.map((page, i) => (
                        <div key={page.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                            <Card onClick={() => navigate(`/sites/${siteId}/pages/${page.id}`)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/10 rounded-xl flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-violet-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-white text-sm truncate">{page.title}</p>
                                            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">/{page.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5 shrink-0 ml-4">
                                        <ScorePill label="SEO" score={page.seoScore} />
                                        <ScorePill label="Fresh" score={page.decayScore} />
                                        <Badge variant={page.publishedAt ? 'success' : 'default'}>
                                            {page.publishedAt ? 'Live' : 'Draft'}
                                        </Badge>
                                        <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">{timeAgo(page.updatedAt)}</span>
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