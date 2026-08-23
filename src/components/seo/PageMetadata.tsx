import { useEffect } from 'react'
import type { Locale } from '@/i18n/routing'

const ORIGIN = 'https://peragus.com.br'
const OG_LOCALE = { pt: 'pt_BR', es: 'es_419', en: 'en_US' } satisfies Record<
  Locale,
  string
>

type PageMetadataProps = {
  locale: Locale
  title: string
  description: string
  canonicalPath: string
  alternates: Record<Locale, string>
}

function upsertMeta(key: 'name' | 'property', value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, value)
    element.dataset.peragusMeta = 'true'
    document.head.appendChild(element)
  }
  element.content = content
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector)
  if (!element) {
    element = document.createElement('link')
    element.dataset.peragusMeta = 'true'
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value))
}

export function PageMetadata({
  locale,
  title,
  description,
  canonicalPath,
  alternates,
}: PageMetadataProps) {
  useEffect(() => {
    const canonical = new URL(canonicalPath, ORIGIN).toString()
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : locale
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:locale', OG_LOCALE[locale])
    upsertMeta('property', 'og:image', `${ORIGIN}/og-peragus.svg`)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonical })

    const hrefLang = { pt: 'pt-BR', es: 'es-419', en: 'en' } satisfies Record<
      Locale,
      string
    >
    for (const target of ['pt', 'es', 'en'] as const) {
      upsertLink(`link[rel="alternate"][hreflang="${hrefLang[target]}"]`, {
        rel: 'alternate',
        hreflang: hrefLang[target],
        href: new URL(alternates[target], ORIGIN).toString(),
      })
    }
  }, [alternates, canonicalPath, description, locale, title])

  return null
}
