import { Link } from 'react-router-dom'
import { homePath, type Locale } from '@/i18n/routing'

const labels = {
  pt: { title: 'Página não encontrada', back: 'Voltar para a Peragus' },
  es: { title: 'Página no encontrada', back: 'Volver a Peragus' },
  en: { title: 'Page not found', back: 'Back to Peragus' },
} satisfies Record<Locale, { title: string; back: string }>

export function NotFound({ locale }: { locale: Locale }) {
  return (
    <main id="main-content" className="min-h-screen px-6 py-32">
      <p className="text-sm text-tertiary">404</p>
      <h1 className="mt-3 text-4xl font-semibold">{labels[locale].title}</h1>
      <Link className="mt-8 inline-flex text-mint" to={homePath(locale)}>
        {labels[locale].back}
      </Link>
    </main>
  )
}
