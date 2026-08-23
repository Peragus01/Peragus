import { Route, Routes, useLocation } from 'react-router-dom'
import { localeFromPathname } from '@/i18n/routing'
import { Landing } from '@/pages/Landing'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  const location = useLocation()

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/es" element={<Landing />} />
      <Route path="/en" element={<Landing />} />
      <Route
        path="*"
        element={<NotFound locale={localeFromPathname(location.pathname)} />}
      />
    </Routes>
  )
}
