// apps/api/src/routes/public.ts
// Public CMS page hosting — serves published pages as full HTML
import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

function p(req: Request, key: string): string {
    return String((req.params as Record<string, string>)[key])
}

function extractText(content: string): string {
    try {
        const parsed = JSON.parse(content)
        if (!parsed.blocks) return content
        return parsed.blocks
            .map((b: { text?: string; content?: string }) => b.text ?? b.content ?? '')
            .filter(Boolean)
            .join('\n')
    } catch {
        return content
    }
}

function contentToHtml(content: string): string {
    try {
        const parsed = JSON.parse(content)
        if (!parsed.blocks) return `<p>${escapeHtml(content)}</p>`
        return parsed.blocks
            .map((block: any) => {
                const text = escapeHtml(block.text ?? block.content ?? '')
                switch (block.type) {
                    case 'heading':
                    case 'h1':
                        return `<h1>${text}</h1>`
                    case 'h2':
                        return `<h2>${text}</h2>`
                    case 'h3':
                        return `<h3>${text}</h3>`
                    case 'list':
                        return `<ul>${text.split('\n').map((li: string) => `<li>${li}</li>`).join('')}</ul>`
                    case 'quote':
                    case 'blockquote':
                        return `<blockquote>${text}</blockquote>`
                    case 'code':
                        return `<pre><code>${text}</code></pre>`
                    case 'image':
                        return block.url ? `<figure><img src="${escapeHtml(block.url)}" alt="${text}" loading="lazy" /><figcaption>${text}</figcaption></figure>` : ''
                    default:
                        return text ? `<p>${text}</p>` : ''
                }
            })
            .filter(Boolean)
            .join('\n')
    } catch {
        return content.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('\n')
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ─── Template Engine ──────────────────────────────────────────────────────
// Replaces {{variable}} and {{{variable}}} (unescaped) placeholders with JSON data values
// Supports {{#if var}}...{{/if}}, {{#each arr}}...{{/each}} basic blocks
function renderTemplate(templateStr: string, data: Record<string, any>): string {
    let result = templateStr

    // Handle {{#each array}}...{{/each}} blocks
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, key, body) => {
        const arr = data[key]
        if (!Array.isArray(arr)) return ''
        return arr.map((item: any, index: number) => {
            let block = body
            if (typeof item === 'object' && item !== null) {
                // Replace {{this.prop}} within each block
                for (const [k, v] of Object.entries(item)) {
                    block = block.replace(new RegExp(`\\{\\{this\\.${k}\\}\\}`, 'g'), escapeHtml(String(v ?? '')))
                    block = block.replace(new RegExp(`\\{\\{\\{this\\.${k}\\}\\}\\}`, 'g'), String(v ?? ''))
                }
                block = block.replace(/\{\{@index\}\}/g, String(index))
            } else {
                block = block.replace(/\{\{this\}\}/g, escapeHtml(String(item)))
                block = block.replace(/\{\{\{this\}\}\}/g, String(item))
            }
            return block
        }).join('')
    })

    // Handle {{#if variable}}...{{/if}} blocks
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, body) => {
        const val = data[key]
        if (!val || (Array.isArray(val) && val.length === 0)) return ''
        return body
    })

    // Replace {{{variable}}} — unescaped (for HTML content)
    result = result.replace(/\{\{\{(\w+)\}\}\}/g, (_match, key) => {
        return String(data[key] ?? '')
    })

    // Replace {{variable}} — escaped
    result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
        return escapeHtml(String(data[key] ?? ''))
    })

    return result
}

// GET /p/:siteSlug/:pageSlug — public page
router.get('/:siteSlug/:pageSlug', async (req: Request, res: Response) => {
    const siteSlug = p(req, 'siteSlug')
    const pageSlug = p(req, 'pageSlug')

    const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
    if (!site) {
        return res.status(404).send(render404Page(siteSlug, pageSlug))
    }

    const page = await prisma.page.findUnique({
        where: { siteId_slug: { siteId: site.id, slug: pageSlug } },
    })

    if (!page || !page.publishedAt) {
        return res.status(404).send(render404Page(siteSlug, pageSlug))
    }

    const metaTitle = page.metaTitle || page.title
    const metaDesc = page.metaDesc || extractText(page.content).slice(0, 160)
    const canonicalUrl = `${req.protocol}://${req.get('host')}/p/${siteSlug}/${pageSlug}`
    const publishDate = page.publishedAt ? new Date(page.publishedAt).toISOString() : ''
    const modifiedDate = page.updatedAt ? new Date(page.updatedAt).toISOString() : ''

    // ─── Template-powered rendering ───────────────────────────────
    if (page.template) {
        let templateData: Record<string, any> = {}
        try {
            templateData = page.templateData ? JSON.parse(page.templateData) : {}
        } catch { }

        // Inject system variables
        templateData.__title = page.title
        templateData.__metaTitle = metaTitle
        templateData.__metaDesc = metaDesc
        templateData.__siteName = site.name
        templateData.__siteSlug = site.slug
        templateData.__pageSlug = page.slug
        templateData.__canonicalUrl = canonicalUrl
        templateData.__publishDate = publishDate
        templateData.__modifiedDate = modifiedDate

        const renderedHtml = renderTemplate(page.template, templateData)

        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        return res.send(renderedHtml)
    }

    // ─── Legacy block-based rendering ─────────────────────────────
    const htmlContent = contentToHtml(page.content)

    // JSON-LD structured data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: metaTitle,
        description: metaDesc,
        datePublished: publishDate,
        dateModified: modifiedDate,
        publisher: {
            '@type': 'Organization',
            name: site.name,
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="title" content="${escapeHtml(metaTitle)}">
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(metaTitle)}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:site_name" content="${escapeHtml(site.name)}">
    <meta property="article:published_time" content="${publishDate}">
    <meta property="article:modified_time" content="${modifiedDate}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${canonicalUrl}">
    <meta property="twitter:title" content="${escapeHtml(metaTitle)}">
    <meta property="twitter:description" content="${escapeHtml(metaDesc)}">
    
    <!-- Robots -->
    <meta name="robots" content="index, follow">
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    
    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">${JSON.stringify(jsonLd, null, 2)}</script>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
            --text: #e8e8ed;
            --text-secondary: #9194a1;
            --text-muted: #5a5d6e;
            --bg: #07070e;
            --bg-card: rgba(255, 255, 255, 0.025);
            --border: rgba(255, 255, 255, 0.06);
            --accent: #7c5cfc;
            --accent-glow: rgba(124, 92, 252, 0.15);
        }
        
        html { scroll-behavior: smooth; }
        
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.8;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse at top, rgba(124, 92, 252, 0.04) 0%, transparent 60%);
            pointer-events: none;
            z-index: 0;
        }
        
        .page-header {
            border-bottom: 1px solid var(--border);
            background: rgba(7, 7, 14, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            position: sticky;
            top: 0;
            z-index: 50;
        }
        
        .page-header-inner {
            max-width: 720px;
            margin: 0 auto;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .site-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--text);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .site-logo {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, var(--accent), #a855f7);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 0 16px var(--accent-glow);
        }
        
        .powered-by {
            font-size: 11px;
            color: var(--text-muted);
            text-decoration: none;
            transition: color 0.2s;
        }
        .powered-by:hover { color: var(--accent); }
        
        article {
            max-width: 720px;
            margin: 0 auto;
            padding: 48px 24px 100px;
            position: relative;
            z-index: 1;
        }
        
        article h1 {
            font-size: 2.5rem;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 16px;
            letter-spacing: -0.04em;
            color: white;
        }
        
        .article-meta {
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .article-meta time {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .content p {
            margin-bottom: 1.5em;
            color: var(--text-secondary);
            font-size: 1.05rem;
        }
        
        .content h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: white;
            margin: 2em 0 0.75em;
            letter-spacing: -0.02em;
        }
        
        .content h3 {
            font-size: 1.2rem;
            font-weight: 600;
            color: white;
            margin: 1.5em 0 0.5em;
        }
        
        .content ul, .content ol {
            margin-bottom: 1.5em;
            padding-left: 1.5em;
            color: var(--text-secondary);
        }
        
        .content li {
            margin-bottom: 0.5em;
            font-size: 1.05rem;
        }
        
        .content blockquote {
            border-left: 3px solid var(--accent);
            padding: 16px 24px;
            margin: 1.5em 0;
            background: var(--bg-card);
            border-radius: 0 12px 12px 0;
            font-style: italic;
            color: var(--text-secondary);
        }
        
        .content pre {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px 24px;
            overflow-x: auto;
            margin: 1.5em 0;
        }
        
        .content code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9em;
        }
        
        .content figure {
            margin: 2em 0;
        }
        
        .content img {
            max-width: 100%;
            border-radius: 12px;
            border: 1px solid var(--border);
        }
        
        .content figcaption {
            font-size: 13px;
            color: var(--text-muted);
            text-align: center;
            margin-top: 8px;
        }
        
        .content a {
            color: var(--accent);
            text-decoration: underline;
            text-underline-offset: 3px;
        }
        
        .content a:hover {
            opacity: 0.8;
        }
        
        ::selection {
            background: rgba(124, 92, 252, 0.3);
            color: white;
        }
        
        @media (max-width: 640px) {
            article h1 { font-size: 1.75rem; }
            article { padding: 32px 16px 80px; }
        }
    </style>
</head>
<body>
    <header class="page-header">
        <div class="page-header-inner">
            <a href="/p/${escapeHtml(siteSlug)}" class="site-name">
                <div class="site-logo">${escapeHtml(site.name.charAt(0).toUpperCase())}</div>
                ${escapeHtml(site.name)}
            </a>
            <a href="/" class="powered-by">Powered by Semantic</a>
        </div>
    </header>
    
    <article>
        <h1>${escapeHtml(page.title)}</h1>
        <div class="article-meta">
            <time datetime="${publishDate}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                Published ${new Date(page.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            ${modifiedDate !== publishDate ? `<span>· Updated ${new Date(page.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>` : ''}
        </div>
        <div class="content">
            ${htmlContent}
        </div>
    </article>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    return res.send(html)
})

// GET /p/:siteSlug — site index: lists all published pages
router.get('/:siteSlug', async (req: Request, res: Response) => {
    const siteSlug = p(req, 'siteSlug')

    const site = await prisma.site.findUnique({
        where: { slug: siteSlug },
        include: {
            pages: {
                where: { publishedAt: { not: null } },
                select: {
                    title: true, slug: true, metaTitle: true, metaDesc: true,
                    content: true, publishedAt: true, updatedAt: true,
                },
                orderBy: { publishedAt: 'desc' },
            },
        },
    })

    if (!site) {
        return res.status(404).send(render404Page(siteSlug, ''))
    }

    const canonicalUrl = `${req.protocol}://${req.get('host')}/p/${siteSlug}`

    const pageListHtml = site.pages.map(page => {
        const desc = page.metaDesc || extractText(page.content).slice(0, 160)
        const pubDate = page.publishedAt
            ? new Date(page.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : ''
        return `
        <a href="/p/${escapeHtml(siteSlug)}/${escapeHtml(page.slug)}" class="page-card">
            <div class="page-card-content">
                <h2>${escapeHtml(page.metaTitle || page.title)}</h2>
                <p>${escapeHtml(desc)}</p>
                <time datetime="${page.publishedAt ? new Date(page.publishedAt).toISOString() : ''}">${pubDate}</time>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(site.name)} — All pages</title>
    <meta name="description" content="Browse all published pages on ${escapeHtml(site.name)}">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(site.name)}">
    <meta property="og:description" content="Browse all published pages on ${escapeHtml(site.name)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta name="robots" content="index, follow">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --text: #e8e8ed; --text-secondary: #9194a1; --text-muted: #5a5d6e;
            --bg: #07070e; --bg-card: rgba(255,255,255,0.025); --border: rgba(255,255,255,0.06);
            --accent: #7c5cfc; --accent-glow: rgba(124,92,252,0.15);
        }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--bg); color: var(--text);
            -webkit-font-smoothing: antialiased; line-height: 1.6;
        }
        body::before {
            content: ''; position: fixed; inset: 0;
            background: radial-gradient(ellipse at top, rgba(124,92,252,0.04) 0%, transparent 60%);
            pointer-events: none; z-index: 0;
        }
        .header {
            border-bottom: 1px solid var(--border);
            background: rgba(7,7,14,0.8); backdrop-filter: blur(20px);
            position: sticky; top: 0; z-index: 50;
        }
        .header-inner {
            max-width: 720px; margin: 0 auto; padding: 16px 24px;
            display: flex; align-items: center; gap: 10px;
        }
        .site-logo {
            width: 32px; height: 32px;
            background: linear-gradient(135deg, var(--accent), #a855f7);
            border-radius: 10px; display: flex; align-items: center; justify-content: center;
            color: white; font-size: 13px; font-weight: 700;
            box-shadow: 0 0 16px var(--accent-glow);
        }
        .site-title { font-size: 15px; font-weight: 600; color: white; }
        .container {
            max-width: 720px; margin: 0 auto; padding: 40px 24px 100px;
            position: relative; z-index: 1;
        }
        .page-count {
            font-size: 13px; color: var(--text-muted); margin-bottom: 24px;
        }
        .page-card {
            display: flex; align-items: center; gap: 16px;
            padding: 20px 24px; border: 1px solid var(--border);
            border-radius: 16px; background: var(--bg-card);
            text-decoration: none; color: inherit;
            transition: all 0.25s ease; margin-bottom: 12px;
        }
        .page-card:hover {
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.12);
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .page-card-content { flex: 1; min-width: 0; }
        .page-card h2 {
            font-size: 16px; font-weight: 600; color: white;
            margin-bottom: 4px; line-height: 1.3;
        }
        .page-card p {
            font-size: 13px; color: var(--text-secondary);
            display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden;
            margin-bottom: 8px;
        }
        .page-card time { font-size: 12px; color: var(--text-muted); }
        .page-card svg { color: var(--text-muted); flex-shrink: 0; }
        .empty {
            text-align: center; padding: 80px 0;
            color: var(--text-muted); font-size: 14px;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-inner">
            <div class="site-logo">${escapeHtml(site.name.charAt(0).toUpperCase())}</div>
            <span class="site-title">${escapeHtml(site.name)}</span>
        </div>
    </header>
    <div class="container">
        <p class="page-count">${site.pages.length} published page${site.pages.length !== 1 ? 's' : ''}</p>
        ${site.pages.length === 0
            ? '<div class="empty">No published pages yet.</div>'
            : pageListHtml
        }
    </div>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return res.send(html)
})

function render404Page(siteSlug: string, pageSlug: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <meta name="robots" content="noindex, nofollow">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: #07070e; color: #e8e8ed;
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            text-align: center;
        }
        body::before {
            content: ''; position: fixed; inset: 0;
            background: radial-gradient(ellipse at top, rgba(124,92,252,0.04) 0%, transparent 60%);
            pointer-events: none;
        }
        .container { position: relative; z-index: 1; padding: 40px; }
        h1 { font-size: 6rem; font-weight: 700; color: rgba(124,92,252,0.2); line-height: 1; margin-bottom: 16px; }
        h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; }
        p { color: #5a5d6e; font-size: 14px; margin-bottom: 24px; }
        a {
            color: #7c5cfc; text-decoration: none; font-weight: 500;
            padding: 10px 24px; border: 1px solid rgba(124,92,252,0.3);
            border-radius: 12px; transition: all 0.2s; display: inline-block;
        }
        a:hover { background: rgba(124,92,252,0.1); border-color: rgba(124,92,252,0.5); }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page not found</h2>
        <p>The page /${siteSlug}${pageSlug ? '/' + pageSlug : ''} doesn't exist or isn't published yet.</p>
        <a href="/">← Go home</a>
    </div>
</body>
</html>`
}

export default router
