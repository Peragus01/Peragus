import type { Locale } from '@/i18n/routing'

export function Landing({ locale }: { locale: Locale }) {
  return (
    <main
      id="main-content"
      data-locale={locale}
      className="min-h-screen px-6 py-32"
    >
      <p>Sandbox B2B - Polygon Amoy</p>
      <h1>Pix no Brasil. Liquidação na sua carteira.</h1>
      <p>
        Valide o fluxo entre uma cobrança Pix simulada e o envio de MockUSDT
        para sua carteira na Polygon Amoy.
      </p>
    </main>
  )
}
