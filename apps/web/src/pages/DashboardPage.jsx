// apps/web/src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sites as sitesApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Icons } from '../components/Icons'
import Layout from '../components/Layout'
import './DashboardPage.css'

export default function DashboardPage() {
    const { user } = useAuth()
    const [sitesList, setSitesList] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        sitesApi.list()
            .then(d => setSitesList(d.sites || []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const totalPages = sitesList.reduce((sum, s) => sum + (s._count?.pages || 0), 0)

    const greeting = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Good morning'
        if (h < 18) return 'Good afternoon'
        return 'Good evening'
    }

    return (
        <Layout>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>{greeting()}, {user?.name?.split(' ')[0]}</h1>
                    <p>Here's an overview of your content platform.</p>
                </div>
            </div>

            <div className="page-body">
                {/* Stats */}
                <div className="stats-grid animate-in">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                            <Icons.globe width={20} height={20} />
                        </div>
                        <div className="stat-data">
                            <span className="stat-value">{loading ? '—' : sitesList.length}</span>
                            <span className="stat-label">Sites</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--blue-subtle)', color: 'var(--blue)' }}>
                            <Icons.file width={20} height={20} />
                        </div>
                        <div className="stat-data">
                            <span className="stat-value">{loading ? '—' : totalPages}</span>
                            <span className="stat-label">Total pages</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
                            <Icons.sparkle width={20} height={20} />
                        </div>
                        <div className="stat-data">
                            <span className="stat-value">AI</span>
                            <span className="stat-label">Powered analysis</span>
                        </div>
                    </div>
                </div>

                {/* Sites List */}
                <div className="dashboard-section animate-in stagger-2">
                    <div className="section-header">
                        <h2>Your sites</h2>
                        <Link to="/sites" className="btn btn-secondary btn-sm">
                            <Icons.plus width={14} height={14} />
                            New site
                        </Link>
                    </div>

                    {loading ? (
                        <div className="sites-grid">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
                            ))}
                        </div>
                    ) : sitesList.length === 0 ? (
                        <div className="empty-state">
                            <Icons.globe width={40} height={40} />
                            <h3>No sites yet</h3>
                            <p>Create your first site to start managing SEO-optimized content.</p>
                            <Link to="/sites" className="btn btn-primary">
                                <Icons.plus width={16} height={16} />
                                Create site
                            </Link>
                        </div>
                    ) : (
                        <div className="sites-grid">
                            {sitesList.map((site, i) => (
                                <Link
                                    key={site.id}
                                    to={`/sites/${site.id}`}
                                    className={`site-card card card-interactive animate-in stagger-${Math.min(i + 1, 4)}`}
                                >
                                    <div className="site-card-icon">
                                        {site.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="site-card-info">
                                        <h3>{site.name}</h3>
                                        <span className="site-card-slug">/{site.slug}</span>
                                    </div>
                                    <div className="site-card-meta">
                                        <span className="badge badge-muted">
                                            <Icons.file width={12} height={12} />
                                            {site._count?.pages || 0} pages
                                        </span>
                                    </div>
                                    <Icons.chevronRight width={16} height={16} className="site-card-arrow" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
