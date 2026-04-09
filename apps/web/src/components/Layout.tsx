// apps/web/src/components/Layout.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()

    function handleLogout() {
        logout()
        navigate('/login')
    }

    const pathParts = location.pathname.split('/').filter(Boolean)
    const isHome = location.pathname === '/'

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Ambient background glows */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[var(--accent-violet)]/[0.03] rounded-full blur-[160px]" />
            </div>

            {/* Top nav — 56px fixed height */}
            <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-violet)] to-violet-500 rounded-[10px] flex items-center justify-center shadow-[0_0_20px_rgba(124,92,252,0.25)] group-hover:shadow-[0_0_28px_rgba(124,92,252,0.45)] transition-shadow duration-300">
                                <span className="text-white text-xs font-bold">S</span>
                            </div>
                            <span className="font-semibold text-white text-sm tracking-tight">Semantic</span>
                        </Link>

                        {/* Nav links */}
                        <nav className="hidden sm:flex items-center gap-1">
                            <Link
                                to="/"
                                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${isHome ? 'text-white bg-white/[0.06]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.03]'}`}
                            >
                                Sites
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                            <div className="w-6 h-6 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-lg flex items-center justify-center ring-1 ring-white/[0.08]">
                                <span className="text-[10px] font-bold text-violet-200">
                                    {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                                </span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">{user?.email}</span>
                        </div>
                        <div className="w-px h-4 bg-[var(--border-subtle)]" />
                        <button
                            onClick={handleLogout}
                            className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumb — 40px */}
            {!isHome && (
                <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-8 h-10 flex items-center">
                        <nav className="flex items-center gap-2 text-xs">
                            <Link to="/" className="text-[var(--text-muted)] hover:text-white transition-colors">
                                Sites
                            </Link>
                            {pathParts.length > 1 && (
                                <>
                                    <svg className="w-3 h-3 text-[var(--text-muted)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="text-[var(--text-secondary)]">
                                        {pathParts.includes('pages') ? 'Editor' : 'Site'}
                                    </span>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {/* Main content — generous padding */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-10 relative z-10 animate-fade-in">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-[var(--border-subtle)] relative z-10">
                <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">© Semantic CMS</span>
                    <span className="text-[11px] text-[var(--text-muted)]">AI-powered SEO Intelligence</span>
                </div>
            </footer>
        </div>
    )
}