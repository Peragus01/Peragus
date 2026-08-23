import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { homeContent } from '../src/content/home/index.ts'
import { legalContent } from '../src/content/legal/index.ts'
import { generateRouteDocuments, ROUTE_DOCUMENTS } from './generate-route-html.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe('localized route HTML generator', () => {
  it('writes complete static metadata for all 15 public routes', async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), 'peragus-routes-'))
    temporaryDirectories.push(outputDirectory)
    const template = `<!doctype html><html lang="pt-BR"><head>
<!-- peragus-route-metadata:start --><!-- peragus-route-metadata:end -->
</head><body><div id="root"></div></body></html>`

    await generateRouteDocuments(template, outputDirectory)

    expect(ROUTE_DOCUMENTS).toHaveLength(15)
    for (const route of ROUTE_DOCUMENTS) {
      const relativePath = route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`
      const html = await readFile(path.join(outputDirectory, relativePath), 'utf8')

      expect(html).toContain(`<html lang="${route.lang}">`)
      expect(html).toContain(`<title>${route.title}</title>`)
      expect(html).toContain(`name="description" content="${route.description}"`)
      expect(html).toContain(`rel="canonical" href="https://peragus.com.br${route.path}"`)
      expect(html).toContain(`property="og:locale" content="${route.ogLocale}"`)
      expect(html).toContain(`property="og:url" content="https://peragus.com.br${route.path}"`)
      expect(html).toContain(`property="og:title" content="${route.title}"`)
      expect(html).toContain(`property="og:description" content="${route.description}"`)
      expect(html).toContain(`name="twitter:title" content="${route.title}"`)
      expect(html).toContain(`name="twitter:description" content="${route.description}"`)
      expect(html).toContain('name="twitter:image" content="https://peragus.com.br/og-peragus.svg"')
      expect((html.match(/rel="alternate"/g) ?? [])).toHaveLength(3)
      for (const [hrefLang, alternatePath] of Object.entries(route.alternates)) {
        expect(html).toContain(
          `rel="alternate" hreflang="${hrefLang}" href="https://peragus.com.br${alternatePath}"`,
        )
      }
    }
  })

  it('stays aligned with the metadata used during client navigation', () => {
    for (const route of ROUTE_DOCUMENTS) {
      const locale = route.path === '/es' || route.path.startsWith('/es/')
        ? 'es'
        : route.path === '/en' || route.path.startsWith('/en/')
          ? 'en'
          : 'pt'
      const slug = route.path.split('/').filter(Boolean).at(-1)
      const isHome = route.path === '/' || route.path === '/es' || route.path === '/en'
      const content = isHome
        ? homeContent[locale].seo
        : legalContent[locale][slug]

      expect(route.title).toBe(isHome ? content.title : `${content.title} | Peragus`)
      expect(route.description).toBe(content.description)
    }
  })
})
