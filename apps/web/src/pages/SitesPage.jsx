// apps/web/src/pages/SitesPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sites as sitesApi } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Icons } from '../components/Icons'
import Layout from '../components/Layout'
import './SitesPage.css'

export default function SitesPage() {
    const toast = useToast()
    const [sitesList, setSitesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ name: '', slug: '' })
    const [creating, setCreating] = useState(false)

    const fetchSites = () => {
        sitesApi.list()
            .then(d => setSitesList(d.sites || []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }

    useEffect(fetchSites, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        setCreating(true)
        try {
            await sitesApi.create(form)
            toast.success('Site created!')
            setShowCreate(false)
            setForm({ name: '', slug: '' })
            fetchSites()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setCreating(false)
        }
    }

    const autoSlug = (name) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    return (
        <Layout>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Sites</h1>
                    <p>Manage your content sites and pages.</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Icons.plus width={16} height={16} />
                        New site
                    </button>
                </div>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="sites-list">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : sitesList.length === 0 ? (
                    <div className="empty-state">
                        <Icons.globe width={48} height={48} />
                        <h3>No sites yet</h3>
                        <p>Create your first site to start publishing SEO-optimized content with AI analysis.</p>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            <Icons.plus width={16} height={16} />
                            Create your first site
                        </button>
                    </div>
                ) : (
                    <div className="sites-list">
                        {sitesList.map((site, i) => (
                            <Link
                                key={site.id}
                                to={`/sites/${site.id}`}
                                className={`site-row card card-interactive animate-in stagger-${Math.min(i + 1, 4)}`}
                            >
                                <div className="site-row-left">
                                    <div className="site-row-icon">
                                        {site.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="site-row-info">
                                        <h3>{site.name}</h3>
                                        <span className="site-row-slug">/{site.slug}</span>
                                    </div>
                                </div>
                                <div className="site-row-right">
                                    <span className="badge badge-muted">
                                        <Icons.file width={12} height={12} />
                                        {site._count?.pages || 0}
                                    </span>
                                    <span className="site-row-date">
                                        {new Date(site.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <Icons.chevronRight width={16} height={16} className="site-card-arrow" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Site Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
                    <div className="modal animate-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Create site</h2>
                            <button className="btn-icon btn-ghost" onClick={() => setShowCreate(false)}>
                                <Icons.x width={18} height={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="input-wrapper">
                                <label htmlFor="site-name">Site name</label>
                                <input
                                    id="site-name"
                                    className="input"
                                    placeholder="My Blog"
                                    value={form.name}
                                    onChange={(e) => setForm({ name: e.target.value, slug: autoSlug(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="input-wrapper">
                                <label htmlFor="site-slug">Slug</label>
                                <input
                                    id="site-slug"
                                    className="input"
                                    placeholder="my-blog"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    required
                                    pattern="^[a-z0-9-]+$"
                                />
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Public URL: /p/{form.slug || '...'}
                                </span>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <div className="spinner" /> : null}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    )
}
