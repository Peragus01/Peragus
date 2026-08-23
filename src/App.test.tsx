import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('public routes', () => {
  it('renders the B2B sandbox proposition at the root', () => {
    renderPath('/')
    expect(screen.getByRole('heading', { name: /pix no brasil/i })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/mockusdt não é usdt/i)
  })

  it('does not expose the former retail dashboard', () => {
    renderPath('/dashboard')
    expect(screen.getByRole('heading', { name: /página não encontrada/i })).toBeInTheDocument()
    expect(screen.queryByText(/painel operacional/i)).not.toBeInTheDocument()
  })

  it('renders the landing page at the Spanish root', () => {
    renderPath('/es')
    expect(screen.getByRole('heading', { name: /pix en brasil/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('data-locale', 'es')
  })

  it('wraps localized pages in the accessible marketing layout', () => {
    renderPath('/es')

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByRole('link', { name: 'Documentación' })).toHaveAttribute(
      'href',
      '/es/docs',
    )
    expect(screen.getByText('peragus.com.br')).toBeInTheDocument()
  })

  it('keeps reserved sandbox paths out of the website router', () => {
    renderPath('/es/register')
    expect(screen.getByRole('heading', { name: /página no encontrada/i })).toBeInTheDocument()
  })

  it('renders the landing page at the English root', () => {
    renderPath('/en')
    expect(screen.getByRole('heading', { name: /pix in brazil/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('data-locale', 'en')
  })

  it.each([
    ['/terms', 'Termos do sandbox'],
    ['/privacy', 'Privacidade'],
    ['/compliance', 'Compliance'],
    ['/security', 'Segurança'],
    ['/es/terms', 'Términos del sandbox'],
    ['/es/privacy', 'Privacidad'],
    ['/es/compliance', 'Cumplimiento'],
    ['/es/security', 'Seguridad'],
    ['/en/terms', 'Sandbox terms'],
    ['/en/privacy', 'Privacy'],
    ['/en/compliance', 'Compliance'],
    ['/en/security', 'Security'],
  ])('renders the localized legal document at %s', (path, title) => {
    renderPath(path)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('localizes the Spanish catch-all', () => {
    renderPath('/es/desconocida')
    expect(screen.getByRole('heading', { name: /página no encontrada/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a peragus/i })).toHaveAttribute('href', '/es')
  })

  it('localizes the English catch-all', () => {
    renderPath('/en/missing')
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to peragus/i })).toHaveAttribute('href', '/en')
  })
})
