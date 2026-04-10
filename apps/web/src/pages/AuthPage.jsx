// apps/web/src/pages/AuthPage.jsx
import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Icons } from '../components/Icons'
import './AuthPage.css'

export default function AuthPage() {
    const { user, login, register } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()

    const [mode, setMode] = useState('login')
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    if (user) return <Navigate to="/" replace />

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (mode === 'login') {
                await login(form.email, form.password)
            } else {
                await register(form.name, form.email, form.password)
            }
            toast.success(`Welcome${mode === 'register' ? '! Account created.' : ' back!'}`)
            navigate('/')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-bg-gradient" />
                <div className="auth-bg-grid" />
            </div>

            <div className="auth-card animate-in">
                <div className="auth-logo">
                    <div className="brand-icon">
                        <Icons.zap width={20} height={20} />
                    </div>
                    <span className="brand-text">SEOIntelligence</span>
                </div>

                <div className="auth-header">
                    <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
                    <p>{mode === 'login' ? 'Sign in to your SEO Intelligence CMS' : 'Start optimizing your content with AI'}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="input-wrapper">
                            <label htmlFor="auth-name">Full name</label>
                            <input
                                id="auth-name"
                                className="input"
                                type="text"
                                placeholder="Jane Smith"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                minLength={2}
                            />
                        </div>
                    )}

                    <div className="input-wrapper">
                        <label htmlFor="auth-email">Email</label>
                        <input
                            id="auth-email"
                            className="input"
                            type="email"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="input-wrapper">
                        <label htmlFor="auth-password">Password</label>
                        <div className="password-input">
                            <input
                                id="auth-password"
                                className="input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword
                                    ? <Icons.eyeOff width={16} height={16} />
                                    : <Icons.eye width={16} height={16} />
                                }
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? <div className="spinner" /> : null}
                        {mode === 'login' ? 'Sign in' : 'Create account'}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>
                        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                    </span>
                    <button
                        type="button"
                        className="auth-switch"
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    >
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                </div>
            </div>
        </div>
    )
}
