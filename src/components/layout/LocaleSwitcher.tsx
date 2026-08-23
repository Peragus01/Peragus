import { Link, useLocation } from 'react-router-dom'
import {
  homePath,
  LOCALES,
  pagePath,
  type Locale,
  type PublicSlug,
} from '@/i18n/routing'

const localeLabel = {
  pt: 'PT',
  es: 'ES',
  en: 'EN',
} satisfies Record<Locale, string>

const publicSlugs = new Set<PublicSlug>([
  'terms',
  'privacy',
  'compliance',
  'security',
])

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const currentSlug =
    lastSegment && publicSlugs.has(lastSegment as PublicSlug)
      ? (lastSegment as PublicSlug)
      : null

  return (
    <nav aria-label="Idioma / Idioma / Language" className="flex items-center gap-1">
      {LOCALES.map((target) => {
        const to = currentSlug ? pagePath(target, currentSlug) : homePath(target)

        return (
          <Link
            key={target}
            to={to}
            aria-current={target === locale ? 'page' : undefined}
            className="flex h-11 min-w-11 items-center justify-center font-mono text-xs text-tertiary transition-colors hover:text-primary aria-[current=page]:text-mint"
          >
            {localeLabel[target]}
          </Link>
        )
      })}
    </nav>
  )
}
