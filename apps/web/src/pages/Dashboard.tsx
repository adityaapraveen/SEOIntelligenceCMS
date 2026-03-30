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

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Your sites</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1.5">
                        {loading ? '...' : `${sites.length} site${sites.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <Button onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Cancel' : (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New site
                        </span>
                    )}
                </Button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="mb-6 animate-fade-in-scale">
                    <Card>
                        <form onSubmit={createSite} className="flex flex-col gap-5">
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                <div className="w-5 h-5 bg-[var(--accent-violet)]/20 rounded-md flex items-center justify-center">
                                    <svg className="w-3 h-3 text-[var(--accent-violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                New site
                            </h2>
                            {error && (
                                <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-2.5">{error}</p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">Name</label>
                                    <input
                                        className="bg-white/[0.04] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all duration-200 hover:border-[var(--border-hover)]"
                                        value={name} placeholder="My Blog"
                                        onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)) }}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">Slug</label>
                                    <input
                                        className="bg-white/[0.04] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-violet)]/50 focus:ring-2 focus:ring-[var(--accent-violet)]/10 transition-all duration-200 font-mono hover:border-[var(--border-hover)]"
                                        value={slug} placeholder="my-blog"
                                        onChange={e => setSlug(slugify(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                                <Button type="submit" loading={creating}>Create site</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Sites grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 rounded-2xl skeleton" />
                    ))}
                </div>
            ) : sites.length === 0 ? (
                <div className="text-center py-28 animate-fade-in">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-violet)]/10 to-violet-600/5 border border-[var(--border-subtle)] rounded-3xl flex items-center justify-center mx-auto mb-5">
                        <svg className="w-7 h-7 text-[var(--accent-violet)]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6" />
                        </svg>
                    </div>
                    <p className="text-white font-medium text-base">No sites yet</p>
                    <p className="text-[var(--text-muted)] text-sm mt-1.5">Create your first site to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site, i) => (
                        <div key={site.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                            <Card onClick={() => navigate(`/sites/${site.id}`)}>
                                <div className="flex items-start justify-between mb-5">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-violet)]/20 to-violet-600/10 border border-violet-500/15 rounded-xl flex items-center justify-center">
                                        <span className="text-violet-400 font-semibold text-sm">{site.name[0].toUpperCase()}</span>
                                    </div>
                                    <Badge variant="default">{site._count.pages} page{site._count.pages !== 1 ? 's' : ''}</Badge>
                                </div>
                                <h3 className="font-medium text-white text-sm mb-1">{site.name}</h3>
                                <p className="text-xs text-[var(--text-muted)] font-mono">/{site.slug}</p>
                                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                                    <p className="text-[11px] text-[var(--text-muted)]">{timeAgo(site.createdAt)}</p>
                                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    )
}