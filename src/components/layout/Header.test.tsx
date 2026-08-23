import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { homeContent } from '@/content/home'
import { Header } from './Header'
import { LocaleSwitcher } from './LocaleSwitcher'

describe('Header', () => {
  it('links the Spanish sandbox CTA to the reserved registration route', () => {
    render(
      <MemoryRouter>
        <Header locale="es" content={homeContent.es} />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: 'Crear cuenta sandbox' }),
    ).toHaveAttribute('href', '/es/register')
  })

  it('opens and closes the mobile dialog accessibly', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Header locale="pt" content={homeContent.pt} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('LocaleSwitcher', () => {
  it('preserves a public slug and marks the active locale', () => {
    render(
      <MemoryRouter initialEntries={['/es/privacy']}>
        <LocaleSwitcher locale="es" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'EN' })).toHaveAttribute(
      'href',
      '/en/privacy',
    )
    expect(screen.getByRole('link', { name: 'ES' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
