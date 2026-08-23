import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { homePath, isUnsupportedLocalePath, LOCALES, localeFromPathname } from '@/i18n/routing'
import { Landing } from '@/pages/Landing'
import { LegalPage } from '@/pages/Legal'
import { NotFound } from '@/pages/NotFound'

function LocalizedNotFound() {
  const location = useLocation()

  if (isUnsupportedLocalePath(location.pathname)) {
    return <Navigate replace to="/" />
  }

  return (
    <NotFound
      locale={localeFromPathname(location.pathname)}
      canonicalPath={location.pathname}
    />
  )
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
          {(['terms', 'privacy', 'compliance', 'security'] as const).map((type) => (
            <Route
              key={type}
              path={type}
              element={<LegalPage locale={locale} type={type} />}
            />
          ))}
        </Route>
      ))}
      <Route path="*" element={<LocalizedNotFound />} />
    </Routes>
  )
}
