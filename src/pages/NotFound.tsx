import { Link } from 'react-router-dom'
import { PageMetadata } from '@/components/seo/PageMetadata'
import { homePath, type Locale } from '@/i18n/routing'

const labels = {
  pt: { title: 'Página não encontrada', description: 'A página solicitada não foi encontrada.', back: 'Voltar para a Peragus' },
  es: { title: 'Página no encontrada', description: 'No se encontró la página solicitada.', back: 'Volver a Peragus' },
  en: { title: 'Page not found', description: 'The requested page was not found.', back: 'Back to Peragus' },
} satisfies Record<Locale, { title: string; description: string; back: string }>

export function NotFound({ locale, canonicalPath }: { locale: Locale; canonicalPath: string }) {
  const label = labels[locale]
  return (
    <main id="main-content" className="min-h-screen px-6 py-32">
      <PageMetadata
        locale={locale}
        title={`${label.title} | Peragus`}
        description={label.description}
        canonicalPath={canonicalPath}
        alternates={{ pt: '/', es: '/es', en: '/en' }}
        noIndex
      />
      <p className="text-sm text-tertiary">404</p>
      <h1 className="mt-3 text-4xl font-semibold">{label.title}</h1>
      <Link className="mt-8 inline-flex text-mint" to={homePath(locale)}>
        {label.back}
      </Link>
    </main>
  )
}
