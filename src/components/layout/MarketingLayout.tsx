import { Outlet } from 'react-router-dom'
import { homeContent } from '@/content/home'
import type { Locale } from '@/i18n/routing'
import { Footer } from './Footer'
import { Header } from './Header'

const skipLinkLabel: Record<Locale, string> = {
  pt: 'Pular para o conteúdo',
  es: 'Saltar al contenido',
  en: 'Skip to content',
}

export function MarketingLayout({ locale }: { locale: Locale }) {
  const content = homeContent[locale]

  return (
    <div className="min-h-screen bg-midnight text-primary">
      <a
        href="#main-content"
        className="sr-only z-[100] bg-mint px-4 py-3 text-midnight focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {skipLinkLabel[locale]}
      </a>
      <Header locale={locale} content={content} />
      <Outlet />
      <Footer locale={locale} content={content} />
    </div>
  )
}
