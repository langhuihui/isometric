import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = import.meta.dirname

function resolveSiteOrigin(): string {
  const fromEnv = process.env.SITE_ORIGIN?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  // Vercel system env (host only, no protocol)
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (vercelHost) {
    const host = vercelHost.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${host}`
  }

  try {
    const seo = JSON.parse(readFileSync(resolve(root, 'seo.config.json'), 'utf8'))
    if (seo.origin) return String(seo.origin).replace(/\/$/, '')
  } catch {
    /* ignore */
  }
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    if (pkg.homepage) return String(pkg.homepage).replace(/\/$/, '')
  } catch {
    /* ignore */
  }
  return ''
}

const siteOrigin = resolveSiteOrigin()

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
    typescript: {
      removeClassFieldsWithoutInitializer: true,
    },
    assumptions: {
      setPublicClassFields: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  plugins: [
    {
      name: 'inject-site-origin',
      transformIndexHtml(html) {
        // Empty origin → root-relative URLs (/og-image.png). Set seo.config.json for absolute OG/canonical.
        return html.replaceAll('__SITE_ORIGIN__', siteOrigin)
      },
      configResolved() {
        if (!siteOrigin) {
          console.warn(
            '[seo] SITE_ORIGIN unset — using root-relative URLs. Set seo.config.json "origin" for absolute OG/canonical.'
          )
        } else {
          console.log(`[seo] SITE_ORIGIN=${siteOrigin}`)
        }
      },
    },
  ],
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: resolve(root, 'index.html'),
        'demo-rounded': resolve(root, 'demo-rounded.html'),
        'demo-cube': resolve(root, 'demo-cube.html'),
        'demo-console': resolve(root, 'demo-console.html'),
        'demo-connector': resolve(root, 'demo-connector.html'),
      },
    },
  },
})
