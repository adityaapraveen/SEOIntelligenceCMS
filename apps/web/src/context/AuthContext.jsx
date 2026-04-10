// apps/web/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { auth as authApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) { setLoading(false); return }
        authApi.me()
            .then(data => { setUser(data.user); localStorage.setItem('user', JSON.stringify(data.user)) })
            .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) })
            .finally(() => setLoading(false))
    }, [])

    const login = async (email, password) => {
        const data = await authApi.login({ email, password })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        return data
    }

    const register = async (name, email, password) => {
        const data = await authApi.register({ name, email, password })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        return data
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
