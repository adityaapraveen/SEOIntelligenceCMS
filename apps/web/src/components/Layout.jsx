// apps/web/src/components/Layout.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icons } from './Icons'
import './Layout.css'

export default function Layout({ children }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-top">
                    <div className="sidebar-brand">
                        <div className="brand-icon">
                            <Icons.zap width={16} height={16} />
                        </div>
                        <span className="brand-text">SEOIntelligence</span>
                    </div>

                    <nav className="sidebar-nav">
                        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <Icons.home width={18} height={18} />
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink to="/sites" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <Icons.globe width={18} height={18} />
                            <span>Sites</span>
                        </NavLink>
                    </nav>
                </div>

                <div className="sidebar-bottom">
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user?.name || 'User'}</span>
                            <span className="user-email">{user?.email || ''}</span>
                        </div>
                    </div>
                    <button className="btn-icon nav-link" onClick={handleLogout} title="Sign out">
                        <Icons.logout width={18} height={18} />
                    </button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
