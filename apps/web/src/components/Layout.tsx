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

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Ambient background glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--accent-violet)]/[0.03] rounded-full blur-[120px]" />
            </div>

            {/* Top nav */}
            <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-violet)] to-violet-500 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(124,92,252,0.3)] group-hover:shadow-[0_0_24px_rgba(124,92,252,0.5)] transition-shadow duration-300">
                            <span className="text-white text-xs font-bold">S</span>
                        </div>
                        <span className="font-semibold text-white text-sm tracking-tight">Semantic</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-xl border border-[var(--border-subtle)]">
                            <div className="w-6 h-6 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-lg flex items-center justify-center">
                                <span className="text-[10px] font-semibold text-violet-300">
                                    {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}
                                </span>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">{user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-[var(--text-muted)] hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/[0.04] cursor-pointer"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumb */}
            {location.pathname !== '/' && (
                <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/60 backdrop-blur-sm">
                    <div className="max-w-6xl mx-auto px-6 h-11 flex items-center">
                        <nav className="flex items-center gap-2 text-xs">
                            <Link to="/" className="text-[var(--text-muted)] hover:text-white transition-colors">
                                Sites
                            </Link>
                            {pathParts.length > 1 && (
                                <>
                                    <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <span className="text-[var(--text-secondary)]">
                                        {pathParts.includes('pages') ? 'Page' : 'Site'}
                                    </span>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 relative z-10 animate-fade-in">
                {children}
            </main>
        </div>
    )
}