import { Route, Routes } from 'react-router-dom'
import { Landing } from '@/pages/Landing'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
