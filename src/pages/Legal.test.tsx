import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LegalPage } from './Legal'

describe('LegalPage', () => {
  it('publishes localized legal-page metadata', () => {
    render(
      <MemoryRouter>
        <LegalPage locale="en" type="security" />
      </MemoryRouter>,
    )

    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Security | Peragus')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://peragus.com.br/en/security',
    )
  })

  it('marks terms as an editorial draft pending qualified review', () => {
    render(
      <MemoryRouter>
        <LegalPage locale="pt" type="terms" />
      </MemoryRouter>,
    )
    expect(screen.getByText(/minuta editorial 0.1/i)).toBeInTheDocument()
    expect(screen.getByText(/revisão jurídica qualificada/i)).toBeInTheDocument()
  })

  it('states the sandbox limits on compliance', () => {
    render(
      <MemoryRouter>
        <LegalPage locale="en" type="compliance" />
      </MemoryRouter>,
    )
    expect(screen.getByText(/does not move real funds/i)).toBeInTheDocument()
  })

  it('does not retain retail purchase language', () => {
    const { container } = render(
      <MemoryRouter>
        <LegalPage locale="es" type="privacy" />
      </MemoryRouter>,
    )
    expect(container.textContent).not.toMatch(/comprar usdt|compra de usdt/i)
  })
})
