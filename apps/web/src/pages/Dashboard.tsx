import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { timeAgo } from '../lib/utils'

interface Site {
    id: string; name: string; slug: string
    createdAt: string
    _count: { pages: number }
}

export default function DashboardPage() {
    const [sites, setSites] = useState<Site[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const navigate = useNavigate()

    useEffect(() => { fetchSites() }, [])

    async function fetchSites() {
        try {
            const { data } = await api.get('/sites')
            setSites(data.sites)
        } finally {
            setLoading(false)
        }
    }

    function slugify(val: string) {
        return val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }

    async function createSite(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setCreating(true)
        try {
            const { data } = await api.post('/sites', { name, slug })
            setSites(prev => [data.site, ...prev])
            setShowForm(false); setName(''); setSlug('')
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Failed to create site')
        } finally {
            setCreating(false)
        }
    }

    const totalPages = sites.reduce((sum, s) => sum + s._count.pages, 0)

    return (
        <Layout>
            {/* Page header */}
            <div className="flex items-start justify-between mb-10">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Your sites</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                        Manage your sites and optimize content for search engines.
                    </p>
                </div>
                <Button onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Cancel' : (
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New site
                        </span>
                    )}
                </Button>
            </div>

            {/* Stats strip */}
            {!loading && sites.length > 0 && (
                <div className="flex gap-4 mb-8 animate-fade-in">
                    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white leading-none">{sites.length}</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-1">Sites</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white leading-none">{totalPages}</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-1">Total pages</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create form */}
            {showForm && (
                <div className="mb-8 animate-scale-in">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-[var(--shadow-elevated)]">
                        <form onSubmit={createSite} className="flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-violet-500/15 rounded-xl flex items-center justify-center">
                                    <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <h2 className="text-base font-semibold text-white">Create new site</h2>
                            </div>
                            {error && (
                                <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/12 rounded-xl px-5 py-3">{error}</p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Site name</label>
                                    <input
                                        className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all hover:border-[var(--border-hover)]"
                                        value={name} placeholder="My Blog"
                                        onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)) }}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">URL slug</label>
                                    <input
                                        className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all font-mono hover:border-[var(--border-hover)]"
                                        value={slug} placeholder="my-blog"
                                        onChange={e => setSlug(slugify(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" loading={creating}>Create site</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sites grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl skeleton" />
                    ))}
                </div>
            ) : sites.length === 0 ? (
                <div className="text-center py-32 animate-fade-in">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-violet)]/10 to-violet-600/5 border border-[var(--border-subtle)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-7 h-7 text-violet-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">No sites yet</p>
                    <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto leading-relaxed">
                        Create your first site to start managing content and optimizing for SEO.
                    </p>
                    <Button className="mt-8" onClick={() => setShowForm(true)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first site
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sites.map((site, i) => (
                        <div key={site.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                            <Card onClick={() => navigate(`/sites/${site.id}`)}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-11 h-11 bg-gradient-to-br from-violet-500/15 to-violet-600/10 border border-violet-500/10 rounded-xl flex items-center justify-center">
                                        <span className="text-violet-400 font-bold text-base">{site.name[0].toUpperCase()}</span>
                                    </div>
                                    <Badge variant="default">{site._count.pages} page{site._count.pages !== 1 ? 's' : ''}</Badge>
                                </div>
                                <h3 className="font-semibold text-white text-[15px] mb-1">{site.name}</h3>
                                <p className="text-xs text-[var(--text-muted)] font-mono">/{site.slug}</p>
                                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                                    <p className="text-xs text-[var(--text-muted)]">{timeAgo(site.createdAt)}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                                        <span>View</span>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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