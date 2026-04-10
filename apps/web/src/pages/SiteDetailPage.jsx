// apps/web/src/pages/SiteDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { sites as sitesApi, pages as pagesApi } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Icons } from '../components/Icons'
import ScoreRing from '../components/ScoreRing'
import Layout from '../components/Layout'
import './SiteDetailPage.css'

export default function SiteDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()

    const [site, setSite] = useState(null)
    const [pagesList, setPagesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ title: '', slug: '', metaTitle: '', metaDesc: '' })
    const [creating, setCreating] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const fetch = () => {
        Promise.all([
            sitesApi.get(id),
            pagesApi.list(id),
        ])
            .then(([sData, pData]) => {
                setSite(sData.site)
                setPagesList(pData.pages || [])
            })
            .catch(() => navigate('/sites'))
            .finally(() => setLoading(false))
    }

    useEffect(fetch, [id])

    const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const handleCreatePage = async (e) => {
        e.preventDefault()
        setCreating(true)
        try {
            const data = await pagesApi.create(id, form)
            toast.success('Page created!')
            setShowCreate(false)
            setForm({ title: '', slug: '', metaTitle: '', metaDesc: '' })
            navigate(`/pages/${data.page.id}`)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteSite = async () => {
        setDeleting(true)
        try {
            await sitesApi.delete(id)
            toast.success('Site deleted')
            navigate('/sites')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <Layout>
                <div className="page-body" style={{ paddingTop: 60 }}>
                    <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 12 }} />
                    <div className="skeleton" style={{ width: 140, height: 16, marginBottom: 32 }} />
                    <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="back-link" onClick={() => navigate('/sites')}>
                        <Icons.arrowLeft width={14} height={14} />
                        Sites
                    </button>
                    <h1>{site?.name}</h1>
                    <p style={{ fontFamily: 'var(--font-mono)' }}>/{site?.slug}</p>
                </div>
                <div className="page-header-actions">
                    <a
                        href={`http://localhost:4000/p/${site?.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="btn btn-secondary btn-sm"
                    >
                        <Icons.externalLink width={14} height={14} />
                        View public
                    </a>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>
                        <Icons.trash width={14} height={14} />
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Icons.plus width={16} height={16} />
                        New page
                    </button>
                </div>
            </div>

            <div className="page-body">
                {pagesList.length === 0 ? (
                    <div className="empty-state">
                        <Icons.file width={48} height={48} />
                        <h3>No pages yet</h3>
                        <p>Create your first page to start writing and analyzing content.</p>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            <Icons.plus width={16} height={16} />
                            Create page
                        </button>
                    </div>
                ) : (
                    <div className="pages-table">
                        <div className="table-header">
                            <span className="col-title">Page</span>
                            <span className="col-seo">SEO</span>
                            <span className="col-decay">Freshness</span>
                            <span className="col-status">Status</span>
                            <span className="col-updated">Updated</span>
                        </div>
                        {pagesList.map((page, i) => (
                            <Link
                                key={page.id}
                                to={`/pages/${page.id}`}
                                className={`table-row animate-in stagger-${Math.min(i + 1, 4)}`}
                            >
                                <span className="col-title">
                                    <strong>{page.title}</strong>
                                    <span className="page-slug">/{page.slug}</span>
                                </span>
                                <span className="col-seo">
                                    {page.seoScore != null
                                        ? <ScoreRing score={page.seoScore} size={34} strokeWidth={3} />
                                        : <span className="badge badge-muted">—</span>
                                    }
                                </span>
                                <span className="col-decay">
                                    {page.decayScore != null
                                        ? <ScoreRing score={page.decayScore} size={34} strokeWidth={3} />
                                        : <span className="badge badge-muted">—</span>
                                    }
                                </span>
                                <span className="col-status">
                                    {page.publishedAt
                                        ? <span className="badge badge-green">Published</span>
                                        : <span className="badge badge-muted">Draft</span>
                                    }
                                </span>
                                <span className="col-updated">
                                    {new Date(page.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Page Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
                    <div className="modal animate-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Create page</h2>
                            <button className="btn-icon btn-ghost" onClick={() => setShowCreate(false)}>
                                <Icons.x width={18} height={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="input-wrapper">
                                <label htmlFor="page-title">Title</label>
                                <input
                                    id="page-title"
                                    className="input"
                                    placeholder="Getting Started Guide"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value, slug: autoSlug(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="input-wrapper">
                                <label htmlFor="page-slug">Slug</label>
                                <input
                                    id="page-slug"
                                    className="input"
                                    placeholder="getting-started"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-wrapper">
                                <label htmlFor="page-meta-title">Meta title (optional)</label>
                                <input
                                    id="page-meta-title"
                                    className="input"
                                    placeholder="SEO page title"
                                    value={form.metaTitle}
                                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                                    maxLength={60}
                                />
                            </div>
                            <div className="input-wrapper">
                                <label htmlFor="page-meta-desc">Meta description (optional)</label>
                                <textarea
                                    id="page-meta-desc"
                                    className="input"
                                    placeholder="Brief description for search engines..."
                                    value={form.metaDesc}
                                    onChange={(e) => setForm({ ...form, metaDesc: e.target.value })}
                                    maxLength={160}
                                    rows={2}
                                />
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

            {/* Delete Confirmation */}
            {showDelete && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDelete(false)}>
                    <div className="modal animate-in">
                        <h2>Delete site</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            This will permanently delete <strong>{site?.name}</strong> and all its pages, versions, and AI reports. This action cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDeleteSite} disabled={deleting}>
                                {deleting ? <div className="spinner" /> : null}
                                Delete site
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}
