// apps/web/src/lib/api.js
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getHeaders() {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
}

async function request(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: getHeaders(),
        ...opts,
    })

    if (res.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        throw new Error('Session expired')
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
}

// ─── Auth ────────────────────────────────────────────────────
export const auth = {
    register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/api/auth/me'),
}

// ─── Sites ───────────────────────────────────────────────────
export const sites = {
    list: () => request('/api/sites'),
    get: (id) => request(`/api/sites/${id}`),
    create: (body) => request('/api/sites', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/sites/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => request(`/api/sites/${id}`, { method: 'DELETE' }),
}

// ─── Pages ───────────────────────────────────────────────────
export const pages = {
    list: (siteId) => request(`/api/pages?siteId=${siteId}`),
    get: (id) => request(`/api/pages/${id}`),
    create: (siteId, body) => request(`/api/pages?siteId=${siteId}`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/pages/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (id) => request(`/api/pages/${id}/publish`, { method: 'POST' }),
    unpublish: (id) => request(`/api/pages/${id}/unpublish`, { method: 'POST' }),
    delete: (id) => request(`/api/pages/${id}`, { method: 'DELETE' }),
    versions: (id) => request(`/api/pages/${id}/versions`),
    version: (id, v) => request(`/api/pages/${id}/versions/${v}`),
}

// ─── AI ──────────────────────────────────────────────────────
export const ai = {
    seo: (pageId) => request(`/api/ai/pages/${pageId}/seo`, { method: 'POST' }),
    decay: (pageId) => request(`/api/ai/pages/${pageId}/decay`, { method: 'POST' }),
    diff: (pageId, versionA, versionB) => request(`/api/ai/pages/${pageId}/diff`, {
        method: 'POST',
        body: JSON.stringify({ versionA, versionB }),
    }),
    report: (pageId, versionA, versionB) => request(`/api/ai/pages/${pageId}/report`, {
        method: 'POST',
        body: JSON.stringify({ versionA, versionB }),
    }),
    reports: (pageId) => request(`/api/ai/pages/${pageId}/reports`),
    getReport: (pageId, reportId) => request(`/api/ai/pages/${pageId}/reports/${reportId}`),
}
