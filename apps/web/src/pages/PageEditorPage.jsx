// apps/web/src/pages/PageEditorPage.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pages as pagesApi, ai as aiApi } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { Icons } from '../components/Icons'
import ScoreRing from '../components/ScoreRing'
import Layout from '../components/Layout'
import './PageEditorPage.css'

// ─── Severity badge helper ──────────────────────────────
function SeverityBadge({ severity }) {
    const map = { critical: 'badge-red', warning: 'badge-yellow', info: 'badge-blue' }
    return <span className={`badge ${map[severity] || 'badge-muted'}`}>{severity}</span>
}

// ─── SEO Issue Row — shows issue, severity, and WHY it matters ──
function IssueRow({ item }) {
    const [expanded, setExpanded] = useState(false)
    const issue = typeof item === 'string' ? item : item?.issue
    const severity = typeof item === 'string' ? 'info' : item?.severity
    const why = typeof item === 'string' ? null : item?.why

    return (
        <div className="issue-row-wrapper">
            <div className="issue-row" onClick={() => why && setExpanded(!expanded)} style={{ cursor: why ? 'pointer' : 'default' }}>
                <div className="issue-row-left">
                    <Icons.alertTriangle width={13} height={13} />
                    <span>{issue}</span>
                </div>
                <div className="issue-row-right">
                    <SeverityBadge severity={severity} />
                    {why && (
                        <button className="btn-icon issue-expand">
                            <Icons.chevronRight width={12} height={12} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease' }} />
                        </button>
                    )}
                </div>
            </div>
            {expanded && why && (
                <div className="issue-why animate-in">
                    <span className="issue-why-label">Why this matters</span>
                    <p>{why}</p>
                </div>
            )}
        </div>
    )
}

// ─── Keyword placement checklist ────────────────────────
function KeywordCheck({ label, present }) {
    return (
        <div className={`kw-check ${present ? 'kw-pass' : 'kw-fail'}`}>
            {present ? <Icons.check width={13} height={13} /> : <Icons.x width={13} height={13} />}
            <span>{label}</span>
        </div>
    )
}

// ─── Risk indicator pill ────────────────────────────────
function RiskPill({ level }) {
    const map = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' }
    return <span className={`badge ${map[level] || 'badge-muted'}`}>{level} risk</span>
}

// ─── Collapsible section ────────────────────────────────
function AuditSection({ icon, title, subtitle, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className={`audit-section ${open ? 'open' : ''}`}>
            <button className="audit-section-header" onClick={() => setOpen(!open)}>
                <div className="audit-section-left">
                    {icon}
                    <div>
                        <span className="audit-section-title">{title}</span>
                        {subtitle && <span className="audit-section-subtitle">{subtitle}</span>}
                    </div>
                </div>
                <Icons.chevronRight width={14} height={14} className="audit-section-chevron" />
            </button>
            {open && <div className="audit-section-body animate-in">{children}</div>}
        </div>
    )
}

// ─── Default template for new pages ─────────────────────
const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #09090b; color: #fafafa; line-height: 1.8; }
        .container { max-width: 720px; margin: 0 auto; padding: 60px 24px; }
        h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.04em; margin-bottom: 16px; }
        .subtitle { color: #a1a1aa; font-size: 1.1rem; margin-bottom: 40px; }
        .content { color: #a1a1aa; font-size: 1.05rem; }
        .content p { margin-bottom: 1.5em; }
        .content h2 { color: #fafafa; font-size: 1.5rem; margin: 2em 0 0.75em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>{{title}}</h1>
        <p class="subtitle">{{subtitle}}</p>
        <div class="content">
            {{{body}}}
        </div>
    </div>
</body>
</html>`

const DEFAULT_TEMPLATE_DATA = JSON.stringify({
    title: "My Page Title",
    subtitle: "A short subtitle for your page",
    description: "SEO meta description for this page",
    body: "<p>Your page content goes here.</p>\n<h2>A Section Heading</h2>\n<p>More content with <strong>rich text</strong> supported.</p>"
}, null, 2)


export default function PageEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()

    const [page, setPage] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [tab, setTab] = useState('editor') // editor | ai | template | versions

    // Editor state
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [metaTitle, setMetaTitle] = useState('')
    const [metaDesc, setMetaDesc] = useState('')
    const [contentText, setContentText] = useState('')

    // Template state
    const [templateCode, setTemplateCode] = useState('')
    const [templateData, setTemplateData] = useState('')
    const [templateSaving, setTemplateSaving] = useState(false)
    const previewRef = useRef(null)

    // AI state
    const [aiLoading, setAiLoading] = useState(false)
    const [seoReport, setSeoReport] = useState(null)
    const [decayReport, setDecayReport] = useState(null)
    const [aiSubTab, setAiSubTab] = useState('seo')

    // Versions state
    const [versions, setVersions] = useState([])
    const [versionsLoading, setVersionsLoading] = useState(false)

    const fetchPage = useCallback(() => {
        pagesApi.get(id)
            .then(d => {
                setPage(d.page)
                setTitle(d.page.title)
                setSlug(d.page.slug)
                setMetaTitle(d.page.metaTitle || '')
                setMetaDesc(d.page.metaDesc || '')
                setTemplateCode(d.page.template || '')
                setTemplateData(d.page.templateData || '')
                try {
                    const parsed = JSON.parse(d.page.content)
                    if (parsed.blocks) {
                        setContentText(parsed.blocks.map(b => b.text || b.content || '').filter(Boolean).join('\n\n'))
                    } else {
                        setContentText(d.page.content === '{}' ? '' : d.page.content)
                    }
                } catch {
                    setContentText(d.page.content)
                }
            })
            .catch(() => navigate('/'))
            .finally(() => setLoading(false))
    }, [id, navigate])

    useEffect(() => { fetchPage() }, [fetchPage])

    // ─── Template preview ────────────────────────────────────
    const renderedPreview = useMemo(() => {
        if (!templateCode) return ''
        try {
            let data = {}
            try { data = JSON.parse(templateData || '{}') } catch { }
            let html = templateCode

            // {{#each arr}}...{{/each}}
            html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_m, key, body) => {
                const arr = data[key]
                if (!Array.isArray(arr)) return ''
                return arr.map((item, idx) => {
                    let b = body
                    if (typeof item === 'object' && item !== null) {
                        for (const [k, v] of Object.entries(item)) {
                            b = b.replace(new RegExp(`\\{\\{this\\.${k}\\}\\}`, 'g'), String(v ?? ''))
                            b = b.replace(new RegExp(`\\{\\{\\{this\\.${k}\\}\\}\\}`, 'g'), String(v ?? ''))
                        }
                        b = b.replace(/\{\{@index\}\}/g, String(idx))
                    } else {
                        b = b.replace(/\{\{this\}\}/g, String(item))
                        b = b.replace(/\{\{\{this\}\}\}/g, String(item))
                    }
                    return b
                }).join('')
            })

            // {{#if var}}...{{/if}}
            html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, key, body) => {
                const val = data[key]
                if (!val || (Array.isArray(val) && val.length === 0)) return ''
                return body
            })

            // {{{unescaped}}}
            html = html.replace(/\{\{\{(\w+)\}\}\}/g, (_m, key) => String(data[key] ?? ''))

            // {{escaped}}
            html = html.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
                const v = String(data[key] ?? '')
                return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            })

            return html
        } catch {
            return '<p>Error rendering template</p>'
        }
    }, [templateCode, templateData])

    // Write preview to iframe
    useEffect(() => {
        if (previewRef.current && tab === 'template') {
            const iframe = previewRef.current
            const doc = iframe.contentDocument || iframe.contentWindow?.document
            if (doc) {
                doc.open()
                doc.write(renderedPreview)
                doc.close()
            }
        }
    }, [renderedPreview, tab])

    const handleSave = async () => {
        setSaving(true)
        try {
            const contentJson = JSON.stringify({
                blocks: contentText.split('\n\n').filter(Boolean).map((text, i) => ({
                    type: i === 0 ? 'heading' : 'paragraph',
                    text,
                })),
            })
            const data = await pagesApi.update(id, {
                title,
                slug,
                metaTitle: metaTitle || null,
                metaDesc: metaDesc || null,
                content: contentJson,
            })
            setPage(data.page)
            toast.success('Page saved')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleTemplateSave = async () => {
        setTemplateSaving(true)
        try {
            // Validate JSON
            if (templateData) {
                try {
                    JSON.parse(templateData)
                } catch {
                    toast.error('Template data must be valid JSON')
                    setTemplateSaving(false)
                    return
                }
            }
            const data = await pagesApi.update(id, {
                template: templateCode || null,
                templateData: templateData || null,
            })
            setPage(data.page)
            toast.success('Template saved')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setTemplateSaving(false)
        }
    }

    const handlePublish = async () => {
        try {
            const data = page.publishedAt
                ? await pagesApi.unpublish(id)
                : await pagesApi.publish(id)
            setPage(data.page)
            toast.success(data.page.publishedAt ? 'Published!' : 'Unpublished')
        } catch (err) {
            toast.error(err.message)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await pagesApi.delete(id)
            toast.success('Page deleted')
            navigate(-1)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setDeleting(false)
        }
    }

    const runSeoAnalysis = async () => {
        setAiLoading(true)
        setAiSubTab('seo')
        try {
            const data = await aiApi.seo(id)
            setSeoReport(data.report)
            if (data.report?.score === 0 && data.report?.grade === 'F') {
                toast.error('AI service returned a fallback report. Check your API key configuration.')
            } else {
                toast.success('SEO audit complete')
            }
            pagesApi.get(id).then(d => setPage(d.page)).catch(() => { })
        } catch (err) {
            toast.error(err.message || 'SEO analysis failed. Please try again.')
        } finally {
            setAiLoading(false)
        }
    }

    const runDecayAnalysis = async () => {
        setAiLoading(true)
        setAiSubTab('decay')
        try {
            const data = await aiApi.decay(id)
            setDecayReport(data.report)
            toast.success('Freshness analysis complete')
            pagesApi.get(id).then(d => setPage(d.page)).catch(() => { })
        } catch (err) {
            toast.error(err.message || 'Freshness analysis failed. Please try again.')
        } finally {
            setAiLoading(false)
        }
    }

    const fetchVersions = async () => {
        setVersionsLoading(true)
        try {
            const data = await pagesApi.versions(id)
            setVersions(data.versions || [])
        } catch {
        } finally {
            setVersionsLoading(false)
        }
    }

    useEffect(() => {
        if (tab === 'versions') fetchVersions()
    }, [tab])

    if (loading) {
        return (
            <Layout>
                <div className="page-body" style={{ paddingTop: 60 }}>
                    <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 16 }} />
                    <div className="skeleton" style={{ height: 300 }} />
                </div>
            </Layout>
        )
    }

    // ─── Count total issues across all SEO categories ───────
    const countIssues = (report) => {
        if (!report) return { critical: 0, warning: 0, info: 0, total: 0 }
        const allIssues = [
            ...(report.titleAnalysis?.issues || []),
            ...(report.descAnalysis?.issues || []),
            ...(report.contentAnalysis?.issues || []),
            ...(report.headingStructure?.issues || []),
            ...(report.keywordOptimization?.issues || []),
            ...(report.internalLinking?.issues || []),
            ...(report.urlSlugAnalysis?.issues || []),
            ...(report.readability?.issues || []),
            ...(report.schemaMarkup?.issues || []),
            ...(report.imageSeo?.issues || []),
            ...(report.mobileUx?.issues || []),
            ...(report.coreWebVitals?.issues || []),
            ...(report.technicalSeo?.issues || []),
        ]
        const critical = allIssues.filter(i => i?.severity === 'critical').length
        const warning = allIssues.filter(i => i?.severity === 'warning').length
        const info = allIssues.filter(i => i?.severity === 'info').length
        return { critical, warning, info, total: allIssues.length }
    }

    const issueCounts = countIssues(seoReport)

    return (
        <Layout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="back-link" onClick={() => navigate(`/sites/${page?.siteId || ''}`)}>
                        <Icons.arrowLeft width={14} height={14} />
                        {page?.site?.name || 'Back'}
                    </button>
                    <h1>{page?.title}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/{page?.slug}</span>
                        {page?.publishedAt
                            ? <span className="badge badge-green">Published</span>
                            : <span className="badge badge-muted">Draft</span>
                        }
                        {page?.template && <span className="badge badge-accent">Template</span>}
                    </div>
                </div>
                <div className="page-header-actions">
                    {page?.publishedAt && (
                        <a href={`http://localhost:4000/p/${page?.site?.slug}/${page?.slug}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
                            <Icons.externalLink width={14} height={14} /> View
                        </a>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={handlePublish}>
                        {page?.publishedAt ? <Icons.eyeOff width={14} height={14} /> : <Icons.upload width={14} height={14} />}
                        {page?.publishedAt ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => setShowDelete(true)}>
                        <Icons.trash width={14} height={14} />
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <div className="spinner" /> : <Icons.check width={16} height={16} />}
                        Save
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Tab bar */}
                <div className="editor-tabs">
                    <button className={`editor-tab ${tab === 'editor' ? 'active' : ''}`} onClick={() => setTab('editor')}>
                        <Icons.edit width={15} height={15} /> Editor
                    </button>
                    <button className={`editor-tab ${tab === 'template' ? 'active' : ''}`} onClick={() => setTab('template')}>
                        <Icons.copy width={15} height={15} /> Template
                    </button>
                    <button className={`editor-tab ${tab === 'ai' ? 'active' : ''}`} onClick={() => setTab('ai')}>
                        <Icons.sparkle width={15} height={15} /> AI Audit
                        {seoReport && <span className="tab-count">{issueCounts.total}</span>}
                    </button>
                    <button className={`editor-tab ${tab === 'versions' ? 'active' : ''}`} onClick={() => setTab('versions')}>
                        <Icons.layers width={15} height={15} /> Versions
                    </button>
                </div>

                {/* ════════════ EDITOR TAB ════════════ */}
                {tab === 'editor' && (
                    <div className="editor-content animate-in">
                        <div className="editor-grid">
                            <div className="editor-main">
                                <div className="input-wrapper">
                                    <label htmlFor="edit-title">Title</label>
                                    <input id="edit-title" className="input editor-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" />
                                </div>
                                <div className="input-wrapper">
                                    <label htmlFor="edit-content">Content</label>
                                    <textarea id="edit-content" className="input editor-textarea" value={contentText} onChange={(e) => setContentText(e.target.value)} placeholder="Write your content here... Separate paragraphs with blank lines." rows={16} />
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {contentText.split(/\s+/).filter(Boolean).length} words · {contentText.length} characters
                                    </span>
                                </div>
                            </div>
                            <div className="editor-sidebar">
                                <div className="editor-sidebar-section">
                                    <h3>SEO Settings</h3>
                                    <div className="input-wrapper">
                                        <label htmlFor="edit-slug">Slug</label>
                                        <input id="edit-slug" className="input" value={slug} onChange={(e) => setSlug(e.target.value)} />
                                    </div>
                                    <div className="input-wrapper">
                                        <label htmlFor="edit-meta-title">Meta title</label>
                                        <input id="edit-meta-title" className="input" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title" maxLength={60} />
                                        <span style={{ fontSize: 11, color: metaTitle.length > 55 ? 'var(--yellow)' : 'var(--text-muted)' }}>{metaTitle.length}/60</span>
                                    </div>
                                    <div className="input-wrapper">
                                        <label htmlFor="edit-meta-desc">Meta description</label>
                                        <textarea id="edit-meta-desc" className="input" value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Brief description for search results..." maxLength={160} rows={3} />
                                        <span style={{ fontSize: 11, color: metaDesc.length > 150 ? 'var(--yellow)' : 'var(--text-muted)' }}>{metaDesc.length}/160</span>
                                    </div>
                                </div>
                                <div className="editor-sidebar-section">
                                    <h3>Scores</h3>
                                    <div className="scores-row">
                                        <div className="score-item"><ScoreRing score={page?.seoScore ?? 0} size={50} /><span>SEO</span></div>
                                        <div className="score-item"><ScoreRing score={page?.decayScore ?? 0} size={50} /><span>Fresh</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════════ TEMPLATE TAB ════════════ */}
                {tab === 'template' && (
                    <div className="template-content animate-in">
                        <div className="template-header">
                            <div className="template-header-left">
                                <h3>Template Engine</h3>
                                <p>Write HTML templates with {'{{variable}}'} placeholders. Fill in JSON data to render your hosted page.</p>
                            </div>
                            <div className="template-actions">
                                {!templateCode && (
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setTemplateCode(DEFAULT_TEMPLATE); setTemplateData(DEFAULT_TEMPLATE_DATA) }}>
                                        <Icons.copy width={14} height={14} /> Load starter template
                                    </button>
                                )}
                                <button className="btn btn-primary" onClick={handleTemplateSave} disabled={templateSaving}>
                                    {templateSaving ? <div className="spinner" /> : <Icons.check width={16} height={16} />}
                                    Save Template
                                </button>
                            </div>
                        </div>

                        <div className="template-grid">
                            {/* Code editor pane */}
                            <div className="template-pane">
                                <div className="template-pane-header">
                                    <span className="template-pane-label">
                                        <Icons.copy width={13} height={13} /> HTML Template
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{templateCode.length} chars</span>
                                </div>
                                <textarea
                                    className="template-editor"
                                    value={templateCode}
                                    onChange={(e) => setTemplateCode(e.target.value)}
                                    placeholder={`<!DOCTYPE html>\n<html>\n<head>\n  <title>{{title}}</title>\n</head>\n<body>\n  <h1>{{title}}</h1>\n  <p>{{description}}</p>\n  {{{body}}}\n</body>\n</html>`}
                                    spellCheck={false}
                                />
                            </div>

                            {/* JSON data pane */}
                            <div className="template-pane">
                                <div className="template-pane-header">
                                    <span className="template-pane-label">
                                        <Icons.settings width={13} height={13} /> JSON Data
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {(() => { try { return Object.keys(JSON.parse(templateData || '{}')).length } catch { return 0 } })()} fields
                                    </span>
                                </div>
                                <textarea
                                    className="template-editor"
                                    value={templateData}
                                    onChange={(e) => setTemplateData(e.target.value)}
                                    placeholder={`{\n  "title": "My Page",\n  "description": "A description",\n  "body": "<p>Content here</p>"\n}`}
                                    spellCheck={false}
                                    style={{ fontSize: 12 }}
                                />
                            </div>
                        </div>

                        {/* Live Preview */}
                        {templateCode && (
                            <div className="template-pane">
                                <div className="template-pane-header">
                                    <span className="template-pane-label">
                                        <Icons.eye width={13} height={13} /> Live Preview
                                    </span>
                                    {page?.publishedAt && (
                                        <a href={`http://localhost:4000/p/${page?.site?.slug}/${page?.slug}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>
                                            <Icons.externalLink width={12} height={12} /> View hosted page
                                        </a>
                                    )}
                                </div>
                                <div className="template-preview-frame">
                                    <iframe ref={previewRef} title="Template Preview" sandbox="allow-same-origin" />
                                </div>
                            </div>
                        )}

                        {/* Help / Reference */}
                        <div className="template-help">
                            <h4>Template Syntax Reference</h4>
                            <table className="template-var-table">
                                <thead>
                                    <tr><th>Syntax</th><th>Description</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td><code>{'{{variable}}'}</code></td><td>Output escaped value from JSON data</td></tr>
                                    <tr><td><code>{'{{{variable}}}'}</code></td><td>Output raw HTML (unescaped) — use for rich content</td></tr>
                                    <tr><td><code>{'{{#if variable}}...{{/if}}'}</code></td><td>Conditional block — renders if variable is truthy</td></tr>
                                    <tr><td><code>{'{{#each array}}...{{/each}}'}</code></td><td>Loop over an array. Use <code>{'{{this}}'}</code> or <code>{'{{this.prop}}'}</code> inside</td></tr>
                                    <tr><td><code>{'{{@index}}'}</code></td><td>Current index inside an each loop</td></tr>
                                </tbody>
                            </table>
                            <p style={{ marginTop: 10 }}>
                                <strong>System variables</strong> are auto-injected when hosted: <code>{'{{__title}}'}</code>, <code>{'{{__metaTitle}}'}</code>, <code>{'{{__metaDesc}}'}</code>, <code>{'{{__siteName}}'}</code>, <code>{'{{__canonicalUrl}}'}</code>, <code>{'{{__publishDate}}'}</code>
                            </p>
                        </div>
                    </div>
                )}

                {/* ════════════ AI AUDIT TAB ════════════ */}
                {tab === 'ai' && (
                    <div className="ai-content animate-in">
                        {/* Action bar */}
                        <div className="ai-action-bar">
                            <div className="ai-action-left">
                                <button className="btn btn-primary" onClick={runSeoAnalysis} disabled={aiLoading}>
                                    {aiLoading && aiSubTab === 'seo' ? <div className="spinner" /> : <Icons.barChart width={16} height={16} />}
                                    Run Full SEO Audit
                                </button>
                                <button className="btn btn-secondary" onClick={runDecayAnalysis} disabled={aiLoading}>
                                    {aiLoading && aiSubTab === 'decay' ? <div className="spinner" /> : <Icons.clock width={16} height={16} />}
                                    Content Freshness
                                </button>
                            </div>
                            {aiLoading && (
                                <div className="ai-loading-indicator">
                                    <div className="spinner" />
                                    <span>AI is analyzing your content…</span>
                                </div>
                            )}
                        </div>

                        {/* Sub-tabs for SEO vs Decay */}
                        {(seoReport || decayReport) && (
                            <div className="ai-sub-tabs">
                                {seoReport && (
                                    <button className={`ai-sub-tab ${aiSubTab === 'seo' ? 'active' : ''}`} onClick={() => setAiSubTab('seo')}>
                                        <Icons.barChart width={14} height={14} /> SEO Audit
                                    </button>
                                )}
                                {decayReport && (
                                    <button className={`ai-sub-tab ${aiSubTab === 'decay' ? 'active' : ''}`} onClick={() => setAiSubTab('decay')}>
                                        <Icons.clock width={14} height={14} /> Freshness
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ──── SEO REPORT ──── */}
                        {aiSubTab === 'seo' && seoReport && (
                            <div className="seo-audit animate-in">
                                {/* Hero score card */}
                                <div className="audit-hero">
                                    <div className="audit-hero-score">
                                        <ScoreRing score={seoReport.score} size={80} strokeWidth={5} />
                                        <div className="audit-hero-info">
                                            <h2>SEO Audit Report</h2>
                                            <span className={`badge badge-${seoReport.grade <= 'B' ? 'green' : seoReport.grade <= 'C' ? 'yellow' : 'red'}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                                                Grade {seoReport.grade}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="audit-hero-stats">
                                        <div className="audit-stat">
                                            <span className="audit-stat-value" style={{ color: 'var(--red)' }}>{issueCounts.critical}</span>
                                            <span className="audit-stat-label">Critical</span>
                                        </div>
                                        <div className="audit-stat">
                                            <span className="audit-stat-value" style={{ color: 'var(--yellow)' }}>{issueCounts.warning}</span>
                                            <span className="audit-stat-label">Warnings</span>
                                        </div>
                                        <div className="audit-stat">
                                            <span className="audit-stat-value" style={{ color: 'var(--blue)' }}>{issueCounts.info}</span>
                                            <span className="audit-stat-label">Info</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="audit-summary">{seoReport.summary}</p>

                                {/* ── Quick Wins (priority) ── */}
                                {seoReport.quickWins?.length > 0 && (
                                    <div className="quick-wins-section">
                                        <h3 className="section-label"><Icons.zap width={14} height={14} /> Priority Actions</h3>
                                        <div className="quick-wins-grid">
                                            {seoReport.quickWins.map((win, i) => (
                                                <div key={i} className="quick-win-card">
                                                    <span className="quick-win-action">{win.action || win}</span>
                                                    {win.why && <p className="quick-win-why">{win.why}</p>}
                                                    <div className="quick-win-meta">
                                                        {win.impact && <span className={`badge badge-${win.impact === 'high' ? 'red' : win.impact === 'medium' ? 'yellow' : 'green'}`}>{win.impact} impact</span>}
                                                        {win.effort && <span className={`badge badge-${win.effort === 'easy' ? 'green' : win.effort === 'moderate' ? 'yellow' : 'red'}`}>{win.effort}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── All audit sections ── */}
                                <div className="audit-sections">
                                    {/* 1. Title Tag */}
                                    {seoReport.titleAnalysis && (
                                        <AuditSection icon={<Icons.file width={16} height={16} />} title="Title Tag" subtitle={`${seoReport.titleAnalysis.charCount || 0} chars · ~${seoReport.titleAnalysis.pixelEstimate || 0}px`} defaultOpen={true}>
                                            <div className="audit-meta-preview">
                                                <span className="preview-label">Current</span>
                                                <code>{seoReport.titleAnalysis.current || '(not set)'}</code>
                                            </div>
                                            {seoReport.titleAnalysis.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.titleAnalysis.suggestion && (
                                                <div className="audit-suggestion">
                                                    <div className="audit-suggestion-top"><Icons.sparkle width={14} height={14} /><span>AI Suggestion</span></div>
                                                    <code className="suggestion-code">{seoReport.titleAnalysis.suggestion}</code>
                                                    <button className="btn btn-primary btn-sm" onClick={() => { setMetaTitle(seoReport.titleAnalysis.suggestion); setTab('editor'); toast.success('Title applied!') }}>
                                                        <Icons.check width={12} height={12} /> Apply
                                                    </button>
                                                </div>
                                            )}
                                        </AuditSection>
                                    )}

                                    {/* 2. Meta Description */}
                                    {seoReport.descAnalysis && (
                                        <AuditSection icon={<Icons.file width={16} height={16} />} title="Meta Description" subtitle={`${seoReport.descAnalysis.charCount || 0} chars`}>
                                            <div className="audit-meta-preview">
                                                <span className="preview-label">Current</span>
                                                <code>{seoReport.descAnalysis.current || '(not set)'}</code>
                                            </div>
                                            {seoReport.descAnalysis.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.descAnalysis.suggestion && (
                                                <div className="audit-suggestion">
                                                    <div className="audit-suggestion-top"><Icons.sparkle width={14} height={14} /><span>AI Suggestion</span></div>
                                                    <code className="suggestion-code">{seoReport.descAnalysis.suggestion}</code>
                                                    <button className="btn btn-primary btn-sm" onClick={() => { setMetaDesc(seoReport.descAnalysis.suggestion); setTab('editor'); toast.success('Description applied!') }}>
                                                        <Icons.check width={12} height={12} /> Apply
                                                    </button>
                                                </div>
                                            )}
                                        </AuditSection>
                                    )}

                                    {/* 3. Content Analysis */}
                                    {seoReport.contentAnalysis && (
                                        <AuditSection icon={<Icons.barChart width={16} height={16} />} title="Content Quality" subtitle={`${seoReport.contentAnalysis.wordCount} words`}>
                                            <div className="audit-data-grid">
                                                <div className="audit-datum"><span className="datum-label">Word count</span><span className="datum-value">{seoReport.contentAnalysis.wordCount}</span></div>
                                                <div className="audit-datum"><span className="datum-label">Readability</span><span className="datum-value">{seoReport.contentAnalysis.readabilityGrade || seoReport.contentAnalysis.readability}</span></div>
                                                <div className="audit-datum"><span className="datum-label">Avg sentence</span><span className="datum-value">{seoReport.contentAnalysis.avgSentenceLength} words</span></div>
                                                <div className="audit-datum"><span className="datum-label">Passive voice</span><span className="datum-value">{seoReport.contentAnalysis.passiveVoicePercent}%</span></div>
                                                <div className="audit-datum"><span className="datum-label">Primary keyword</span><span className="datum-value" style={{ color: 'var(--accent)' }}>{seoReport.contentAnalysis.primaryKeyword}</span></div>
                                                <div className="audit-datum"><span className="datum-label">Keyword density</span><span className="datum-value">{seoReport.contentAnalysis.keywordDensity}</span></div>
                                            </div>
                                            {seoReport.contentAnalysis.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                        </AuditSection>
                                    )}

                                    {/* 4. Heading Structure */}
                                    {seoReport.headingStructure && (
                                        <AuditSection icon={<Icons.layers width={16} height={16} />} title="Heading Structure" subtitle={seoReport.headingStructure.hierarchy}>
                                            <div className="audit-data-grid">
                                                <div className="audit-datum"><span className="datum-label">H1 tags</span><span className="datum-value">{seoReport.headingStructure.h1Count}</span></div>
                                                <div className="audit-datum"><span className="datum-label">H2 tags</span><span className="datum-value">{seoReport.headingStructure.h2Count}</span></div>
                                            </div>
                                            {seoReport.headingStructure.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.headingStructure.suggestions?.map((s, i) => (
                                                <div key={i} className="audit-tip"><Icons.sparkle width={12} height={12} />{s}</div>
                                            ))}
                                        </AuditSection>
                                    )}

                                    {/* 5. Keyword Optimization */}
                                    {seoReport.keywordOptimization && (
                                        <AuditSection icon={<Icons.search width={16} height={16} />} title="Keyword Optimization" subtitle={seoReport.keywordOptimization.primaryKeyword ? `"${seoReport.keywordOptimization.primaryKeyword}"` : ''}>
                                            <div className="kw-placement-grid">
                                                <KeywordCheck label="In title tag" present={seoReport.keywordOptimization.keywordInTitle} />
                                                <KeywordCheck label="In H1 heading" present={seoReport.keywordOptimization.keywordInH1} />
                                                <KeywordCheck label="In first 100 words" present={seoReport.keywordOptimization.keywordInFirst100Words} />
                                                <KeywordCheck label="In URL slug" present={seoReport.keywordOptimization.keywordInSlug} />
                                                <KeywordCheck label="In meta description" present={seoReport.keywordOptimization.keywordInMetaDesc} />
                                            </div>
                                            {seoReport.keywordOptimization.secondaryKeywords?.length > 0 && (
                                                <div className="kw-secondary">
                                                    <span className="datum-label">Secondary keywords</span>
                                                    <div className="kw-tags">
                                                        {seoReport.keywordOptimization.secondaryKeywords.map((kw, i) => (
                                                            <span key={i} className="badge badge-accent">{kw}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {seoReport.keywordOptimization.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                        </AuditSection>
                                    )}

                                    {/* 6. URL / Slug */}
                                    {seoReport.urlSlugAnalysis && (
                                        <AuditSection icon={<Icons.globe width={16} height={16} />} title="URL & Slug" subtitle={`${seoReport.urlSlugAnalysis.length} chars`}>
                                            <div className="audit-meta-preview">
                                                <span className="preview-label">Current URL</span>
                                                <code>{seoReport.urlSlugAnalysis.current}</code>
                                            </div>
                                            {seoReport.urlSlugAnalysis.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.urlSlugAnalysis.suggestion && seoReport.urlSlugAnalysis.suggestion !== seoReport.urlSlugAnalysis.current && (
                                                <div className="audit-suggestion">
                                                    <div className="audit-suggestion-top"><Icons.sparkle width={14} height={14} /><span>Suggested slug</span></div>
                                                    <code className="suggestion-code">{seoReport.urlSlugAnalysis.suggestion}</code>
                                                    <button className="btn btn-primary btn-sm" onClick={() => { setSlug(seoReport.urlSlugAnalysis.suggestion); setTab('editor'); toast.success('Slug applied!') }}>
                                                        <Icons.check width={12} height={12} /> Apply
                                                    </button>
                                                </div>
                                            )}
                                        </AuditSection>
                                    )}

                                    {/* 7. Readability */}
                                    {seoReport.readability && (
                                        <AuditSection icon={<Icons.eye width={16} height={16} />} title="Readability" subtitle={`Flesch: ${seoReport.readability.fleschScore} · ${seoReport.readability.gradeLevel}`}>
                                            <div className="audit-data-grid">
                                                <div className="audit-datum"><span className="datum-label">Flesch score</span><span className="datum-value">{seoReport.readability.fleschScore}</span></div>
                                                <div className="audit-datum"><span className="datum-label">Grade level</span><span className="datum-value">{seoReport.readability.gradeLevel}</span></div>
                                                <div className="audit-datum"><span className="datum-label">Words/sentence</span><span className="datum-value">{seoReport.readability.avgWordsPerSentence}</span></div>
                                                <div className="audit-datum"><span className="datum-label">Complex words</span><span className="datum-value">{seoReport.readability.complexWordPercent}%</span></div>
                                            </div>
                                            {seoReport.readability.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                        </AuditSection>
                                    )}

                                    {/* 8. Internal Linking */}
                                    {seoReport.internalLinking && (
                                        <AuditSection icon={<Icons.externalLink width={16} height={16} />} title="Internal Linking" subtitle={`${seoReport.internalLinking.estimatedLinks} links`}>
                                            {seoReport.internalLinking.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.internalLinking.suggestions?.map((s, i) => (
                                                <div key={i} className="audit-tip"><Icons.sparkle width={12} height={12} />{s}</div>
                                            ))}
                                        </AuditSection>
                                    )}

                                    {/* 9. Schema Markup */}
                                    {seoReport.schemaMarkup && (
                                        <AuditSection icon={<Icons.copy width={16} height={16} />} title="Schema & Structured Data" subtitle={seoReport.schemaMarkup.recommended?.length ? `${seoReport.schemaMarkup.recommended.length} schemas` : ''}>
                                            {seoReport.schemaMarkup.recommended?.length > 0 && (
                                                <div className="kw-secondary">
                                                    <span className="datum-label">Recommended schemas</span>
                                                    <div className="kw-tags">
                                                        {seoReport.schemaMarkup.recommended.map((s, i) => <span key={i} className="badge badge-accent">{s}</span>)}
                                                    </div>
                                                </div>
                                            )}
                                            {seoReport.schemaMarkup.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                        </AuditSection>
                                    )}

                                    {/* 10. Image SEO */}
                                    {seoReport.imageSeo && (
                                        <AuditSection icon={<Icons.eye width={16} height={16} />} title="Image SEO" subtitle={`${seoReport.imageSeo.estimatedImages} images`}>
                                            {seoReport.imageSeo.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.imageSeo.suggestions?.map((s, i) => (
                                                <div key={i} className="audit-tip"><Icons.sparkle width={12} height={12} />{s}</div>
                                            ))}
                                        </AuditSection>
                                    )}

                                    {/* 11. Technical SEO */}
                                    {seoReport.technicalSeo && (
                                        <AuditSection icon={<Icons.settings width={16} height={16} />} title="Technical SEO" subtitle="Canonical · OG · Twitter · Robots">
                                            <div className="kw-placement-grid">
                                                <KeywordCheck label="Canonical tag needed" present={!seoReport.technicalSeo.canonicalNeeded} />
                                                <KeywordCheck label="Open Graph complete" present={seoReport.technicalSeo.openGraphComplete} />
                                                <KeywordCheck label="Twitter Card ready" present={seoReport.technicalSeo.twitterCardReady} />
                                            </div>
                                            {seoReport.technicalSeo.robotsDirective && (
                                                <div className="audit-meta-preview" style={{ marginTop: 4 }}>
                                                    <span className="preview-label">Robots</span>
                                                    <code>{seoReport.technicalSeo.robotsDirective}</code>
                                                </div>
                                            )}
                                            {seoReport.technicalSeo.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                        </AuditSection>
                                    )}

                                    {/* 12. Core Web Vitals */}
                                    {seoReport.coreWebVitals && (
                                        <AuditSection icon={<Icons.zap width={16} height={16} />} title="Core Web Vitals" subtitle="LCP · CLS · FID">
                                            <div className="cwv-grid">
                                                <div className="cwv-item"><span className="cwv-label">LCP</span><span className="cwv-name">Largest Contentful Paint</span><RiskPill level={seoReport.coreWebVitals.lcpRisk} /></div>
                                                <div className="cwv-item"><span className="cwv-label">CLS</span><span className="cwv-name">Cumulative Layout Shift</span><RiskPill level={seoReport.coreWebVitals.clsRisk} /></div>
                                                <div className="cwv-item"><span className="cwv-label">FID</span><span className="cwv-name">First Input Delay</span><RiskPill level={seoReport.coreWebVitals.fidRisk} /></div>
                                            </div>
                                            {seoReport.coreWebVitals.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                        </AuditSection>
                                    )}

                                    {/* 13. Mobile UX */}
                                    {seoReport.mobileUx && (
                                        <AuditSection icon={<Icons.download width={16} height={16} />} title="Mobile UX" subtitle="Responsive & mobile-friendliness">
                                            {seoReport.mobileUx.issues?.map((item, i) => <IssueRow key={i} item={item} />)}
                                            {seoReport.mobileUx.suggestions?.map((s, i) => (
                                                <div key={i} className="audit-tip"><Icons.sparkle width={12} height={12} />{s}</div>
                                            ))}
                                        </AuditSection>
                                    )}

                                    {/* 14. Competitive Insights */}
                                    {seoReport.competitiveInsights && (
                                        <AuditSection icon={<Icons.barChart width={16} height={16} />} title="Competitive Insights" subtitle={seoReport.competitiveInsights.estimatedDifficulty ? `${seoReport.competitiveInsights.estimatedDifficulty} difficulty` : ''}>
                                            {seoReport.competitiveInsights.contentGaps?.length > 0 && (
                                                <div className="kw-secondary">
                                                    <span className="datum-label">Content gaps</span>
                                                    {seoReport.competitiveInsights.contentGaps.map((g, i) => (
                                                        <div key={i} className="audit-tip"><Icons.alertTriangle width={12} height={12} />{g}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {seoReport.competitiveInsights.differentiators?.length > 0 && (
                                                <div className="kw-secondary" style={{ marginTop: 8 }}>
                                                    <span className="datum-label">Your differentiators</span>
                                                    {seoReport.competitiveInsights.differentiators.map((d, i) => (
                                                        <div key={i} className="audit-tip" style={{ color: 'var(--green)' }}><Icons.check width={12} height={12} />{d}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </AuditSection>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ──── DECAY / FRESHNESS REPORT ──── */}
                        {aiSubTab === 'decay' && decayReport && (
                            <div className="seo-audit animate-in">
                                <div className="audit-hero">
                                    <div className="audit-hero-score">
                                        <ScoreRing score={decayReport.score} size={80} strokeWidth={5} />
                                        <div className="audit-hero-info">
                                            <h2>Content Freshness Report</h2>
                                            <span className={`badge badge-${decayReport.riskLevel === 'fresh' ? 'green' : decayReport.riskLevel === 'aging' ? 'yellow' : 'red'}`} style={{ fontSize: 13, padding: '4px 12px' }}>
                                                {decayReport.riskLevel}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="audit-hero-stats">
                                        <div className="audit-stat"><span className="audit-stat-value">{decayReport.domain}</span><span className="audit-stat-label">Domain</span></div>
                                        <div className="audit-stat"><span className="audit-stat-value">{decayReport.estimatedDecayMonths}</span><span className="audit-stat-label">Months to decay</span></div>
                                        <div className="audit-stat"><span className="audit-stat-value">{decayReport.daysUntilStale}</span><span className="audit-stat-label">Days until stale</span></div>
                                    </div>
                                </div>

                                {decayReport.reasons?.length > 0 && (
                                    <AuditSection icon={<Icons.alertTriangle width={16} height={16} />} title="Decay Signals" subtitle={`${decayReport.reasons.length} signals`} defaultOpen={true}>
                                        {decayReport.reasons.map((r, i) => (
                                            <div key={i} className="issue-row"><div className="issue-row-left"><Icons.alertTriangle width={13} height={13} /><span>{r}</span></div><div className="issue-row-right"><SeverityBadge severity="warning" /></div></div>
                                        ))}
                                    </AuditSection>
                                )}

                                {decayReport.refreshSuggestions?.length > 0 && (
                                    <AuditSection icon={<Icons.sparkle width={16} height={16} />} title="Refresh Suggestions" subtitle={`${decayReport.refreshSuggestions.length} actions`} defaultOpen={true}>
                                        {decayReport.refreshSuggestions.map((s, i) => (
                                            <div key={i} className="audit-tip"><Icons.zap width={12} height={12} />{s}</div>
                                        ))}
                                    </AuditSection>
                                )}

                                {decayReport.topicsToUpdate?.length > 0 && (
                                    <AuditSection icon={<Icons.edit width={16} height={16} />} title="Topics to Update" defaultOpen={false}>
                                        <div className="kw-tags" style={{ paddingTop: 4 }}>
                                            {decayReport.topicsToUpdate.map((t, i) => <span key={i} className="badge badge-accent">{t}</span>)}
                                        </div>
                                    </AuditSection>
                                )}
                            </div>
                        )}

                        {/* Empty state */}
                        {!seoReport && !decayReport && !aiLoading && (
                            <div className="empty-state">
                                <Icons.sparkle width={48} height={48} />
                                <h3>AI-powered SEO Audit</h3>
                                <p>Run a comprehensive SEO audit to get technical insights across 14 analysis categories with actionable fixes.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ════════════ VERSIONS TAB ════════════ */}
                {tab === 'versions' && (
                    <div className="versions-content animate-in">
                        {versionsLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="empty-state">
                                <Icons.layers width={48} height={48} />
                                <h3>No versions yet</h3>
                                <p>Save the page to create the first version snapshot.</p>
                            </div>
                        ) : (
                            <div className="versions-list">
                                {versions.map((v, i) => (
                                    <div key={v.id} className={`version-row card card-interactive animate-in stagger-${Math.min(i + 1, 4)}`}>
                                        <div className="version-info">
                                            <span className="version-number">v{v.version}</span>
                                            <span className="version-title">{v.metaTitle || 'Untitled'}</span>
                                        </div>
                                        <span className="version-date">
                                            {new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            {showDelete && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDelete(false)}>
                    <div className="modal animate-in">
                        <h2>Delete page</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            This will permanently delete <strong>{page?.title}</strong> and all its versions and AI reports.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <div className="spinner" /> : null}
                                Delete page
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}
