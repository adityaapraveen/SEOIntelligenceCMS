import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuthStore()
    const navigate = useNavigate()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data } = await api.post('/auth/login', { email, password })
            login(data.token, data.user)
            navigate('/')
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[var(--accent-violet)]/[0.05] rounded-full blur-[180px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-800/[0.03] rounded-full blur-[140px]" />
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '64px 64px',
                    }}
                />
            </div>

            <div className="w-full max-w-[380px] relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-10">
                    <div className="w-9 h-9 bg-gradient-to-br from-[var(--accent-violet)] to-violet-500 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(124,92,252,0.35)]">
                        <span className="text-white font-bold text-sm">S</span>
                    </div>
                    <span className="font-bold text-white text-lg tracking-tight">Semantic</span>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-7 backdrop-blur-sm shadow-[var(--shadow-elevated)]">
                    <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
                    <p className="text-[13px] text-[var(--text-muted)] mb-6">Sign in to your account to continue</p>

                    {error && (
                        <div className="mb-5 px-4 py-3 bg-red-500/8 border border-red-500/12 rounded-xl text-[13px] text-red-400 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                        <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
                            Sign in
                        </Button>
                    </form>
                </div>

                <p className="text-center text-[13px] text-[var(--text-muted)] mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-[var(--accent-violet)] hover:text-[var(--accent-violet-hover)] font-medium transition-colors">
                        Create one
                    </Link>
                </p>

                <p className="text-center text-[10px] text-[var(--text-muted)]/60 mt-8">
                    AI-powered SEO Intelligence CMS
                </p>
            </div>
        </div>
    )
}