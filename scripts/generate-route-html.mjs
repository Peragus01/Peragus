import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ORIGIN = 'https://peragus.com.br'
const SOCIAL_IMAGE = `${ORIGIN}/og-peragus.svg`
const LOCALES = {
  pt: { prefix: '', lang: 'pt-BR', hrefLang: 'pt-BR', ogLocale: 'pt_BR' },
  es: { prefix: '/es', lang: 'es', hrefLang: 'es-419', ogLocale: 'es_419' },
  en: { prefix: '/en', lang: 'en', hrefLang: 'en', ogLocale: 'en_US' },
}

const CONTENT = {
  pt: {
    home: {
      title: 'Peragus | Sandbox B2B para Pix e liquidação on-chain',
      description: 'Valide um fluxo de pagamento Pix simulado e liquidação em MockUSDT na Polygon Amoy.',
    },
    terms: { title: 'Termos do sandbox', description: 'Condições editoriais para avaliação técnica do ambiente de testes.' },
    privacy: { title: 'Privacidade', description: 'Informações factuais sobre dados no site institucional e no futuro sandbox.' },
    compliance: { title: 'Compliance', description: 'Limites atuais e critérios para futuras integrações operacionais.' },
    security: { title: 'Segurança', description: 'Orientações para domínio, carteira e credenciais no ambiente de testes.' },
  },
  es: {
    home: {
      title: 'Peragus | Sandbox B2B para Pix y liquidación on-chain',
      description: 'Valida un flujo de pago Pix simulado y liquidación en MockUSDT en Polygon Amoy.',
    },
    terms: { title: 'Términos del sandbox', description: 'Condiciones editoriales para la evaluación técnica del entorno de pruebas.' },
    privacy: { title: 'Privacidad', description: 'Información factual sobre datos en el sitio institucional y en el futuro sandbox.' },
    compliance: { title: 'Cumplimiento', description: 'Límites actuales y criterios para futuras integraciones operativas.' },
    security: { title: 'Seguridad', description: 'Orientaciones sobre dominio, billetera y credenciales en el entorno de pruebas.' },
  },
  en: {
    home: {
      title: 'Peragus | B2B sandbox for Pix and on-chain settlement',
      description: 'Validate a simulated Pix payment and MockUSDT settlement flow on Polygon Amoy.',
    },
    terms: { title: 'Sandbox terms', description: 'Editorial conditions for technical evaluation of the test environment.' },
    privacy: { title: 'Privacy', description: 'Factual information about data on the institutional website and future sandbox.' },
    compliance: { title: 'Compliance', description: 'Current limits and criteria for future operational integrations.' },
    security: { title: 'Security', description: 'Guidance for the official domain, wallets and credentials in the test environment.' },
  },
}

const PAGE_KEYS = ['home', 'terms', 'privacy', 'compliance', 'security']

function routePath(locale, page) {
  const { prefix } = LOCALES[locale]
  return page === 'home' ? prefix || '/' : `${prefix}/${page}`
}

export const ROUTE_DOCUMENTS = Object.entries(LOCALES).flatMap(([locale, localeData]) =>
  PAGE_KEYS.map((page) => {
    const content = CONTENT[locale][page]
    return {
      path: routePath(locale, page),
      lang: localeData.lang,
      ogLocale: localeData.ogLocale,
      title: page === 'home' ? content.title : `${content.title} | Peragus`,
      description: content.description,
      alternates: Object.fromEntries(
        Object.entries(LOCALES).map(([targetLocale, targetData]) => [
          targetData.hrefLang,
          routePath(targetLocale, page),
        ]),
      ),
    }
  }),
)

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

function metadataBlock(route) {
  const canonical = `${ORIGIN}${route.path}`
  const title = escapeAttribute(route.title)
  const description = escapeAttribute(route.description)
  const alternates = Object.entries(route.alternates)
    .map(
      ([hrefLang, alternatePath]) =>
        `    <link rel="alternate" hreflang="${hrefLang}" href="${ORIGIN}${alternatePath}" />`,
    )
    .join('\n')
  const organization = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Peragus',
    url: `${ORIGIN}/`,
    description: route.description,
  })

  return `<!-- peragus-route-metadata:start -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
${alternates}
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:locale" content="${route.ogLocale}" />
    <meta property="og:image" content="${SOCIAL_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${SOCIAL_IMAGE}" />
    <script type="application/ld+json">${organization}</script>
    <!-- peragus-route-metadata:end -->`
}

export async function generateRouteDocuments(template, outputDirectory) {
  const markerPattern = /<!-- peragus-route-metadata:start -->[\s\S]*?<!-- peragus-route-metadata:end -->/
  if (!markerPattern.test(template)) {
    throw new Error('Route metadata markers are missing from the HTML template')
  }

  await Promise.all(
    ROUTE_DOCUMENTS.map(async (route) => {
      const html = template
        .replace(/<html lang="[^"]*">/, `<html lang="${route.lang}">`)
        .replace(markerPattern, metadataBlock(route))
      const outputPath =
        route.path === '/'
          ? path.join(outputDirectory, 'index.html')
          : path.join(outputDirectory, route.path.slice(1), 'index.html')
      await mkdir(path.dirname(outputPath), { recursive: true })
      await writeFile(outputPath, html)
    }),
  )
}

async function main() {
  const outputDirectory = path.resolve('dist')
  const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')
  await generateRouteDocuments(template, outputDirectory)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
