#!/usr/bin/env node
/**
 * Writes robots.txt + sitemap.xml from seo.config.json / SITE_ORIGIN / package.json homepage.
 * Fail-open: if origin is missing, emit crawlable robots without Sitemap and skip sitemap locs.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
mkdirSync(pub, { recursive: true })

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const seo = readJson(join(root, 'seo.config.json')) || {}
const pkg = readJson(join(root, 'package.json')) || {}

function resolveOrigin() {
  const fromEnv = process.env.SITE_ORIGIN?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  }
  const fromSeo = String(seo.origin || '').trim()
  if (fromSeo) return fromSeo.replace(/\/$/, '')
  const fromPkg = String(pkg.homepage || '').trim()
  if (fromPkg) return fromPkg.replace(/\/$/, '')
  return ''
}

const origin = resolveOrigin()

const pages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/demo-rounded.html', priority: '0.7', changefreq: 'monthly' },
  { path: '/demo-connector.html', priority: '0.6', changefreq: 'monthly' },
]

let robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Debug pages
Disallow: /test-
`
if (origin) {
  robots += `\nSitemap: ${origin}/sitemap.xml\n`
}
writeFileSync(join(pub, 'robots.txt'), robots)

if (origin) {
  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${origin}${p.path === '/' ? '/' : p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join('\n')
  writeFileSync(
    join(pub, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
  )
  console.log(`[seo] origin=${origin} → robots.txt + sitemap.xml`)
} else {
  writeFileSync(
    join(pub, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`
  )
  console.warn('[seo] SITE_ORIGIN / seo.config.json origin / package.json homepage unset — sitemap empty')
}
