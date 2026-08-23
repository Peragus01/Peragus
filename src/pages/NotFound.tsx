import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main id="main-content" className="min-h-screen px-6 py-32">
      <p className="text-sm text-text-tertiary">404</p>
      <h1 className="mt-3 text-4xl font-semibold">Página não encontrada</h1>
      <Link className="mt-8 inline-flex text-mint" to="/">Voltar para a Peragus</Link>
    </main>
  )
}
