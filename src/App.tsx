import { Route, Routes, useLocation } from 'react-router-dom'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { homePath, LOCALES, localeFromPathname } from '@/i18n/routing'
import { Landing } from '@/pages/Landing'
import { NotFound } from '@/pages/NotFound'

function LocalizedNotFound() {
  const location = useLocation()

  return <NotFound locale={localeFromPathname(location.pathname)} />
}

export default function App() {
  return (
    <Routes>
      {LOCALES.map((locale) => (
        <Route
          key={locale}
          path={homePath(locale)}
          element={<MarketingLayout locale={locale} />}
        >
          <Route index element={<Landing locale={locale} />} />
        </Route>
      ))}
      <Route path="*" element={<LocalizedNotFound />} />
    </Routes>
  )
}
