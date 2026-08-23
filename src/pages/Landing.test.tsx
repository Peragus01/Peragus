import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Landing } from './Landing'

describe('Landing', () => {
  it('states the tested flow and limits before conversion', () => {
    render(
      <MemoryRouter>
        <Landing locale="pt" />
      </MemoryRouter>,
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(
      within(main).getByRole('heading', {
        level: 1,
        name: 'Pix no Brasil. Liquidação na sua carteira.',
      }),
    ).toBeInTheDocument()
    const microDisclosure = within(main).getByText(
      'Ambiente de testes: sem movimentação de fundos reais. MockUSDT não é USDT.',
    )
    const firstPrimaryCta = within(main).getAllByRole('link', {
      name: 'Criar conta sandbox',
    })[0]
    expect(
      microDisclosure.compareDocumentPosition(firstPrimaryCta) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('uses one primary CTA label consistently', () => {
    render(
      <MemoryRouter>
        <Landing locale="en" />
      </MemoryRouter>,
    )
    const primaryLinks = screen.getAllByRole('link', {
      name: 'Create sandbox account',
    })
    expect(primaryLinks).toHaveLength(2)
    for (const link of primaryLinks) {
      expect(link).toHaveAttribute('href', '/en/register')
    }
    expect(screen.getByRole('link', { name: 'Understand the flow' })).toHaveAttribute(
      'href',
      '/en#como-funciona',
    )
    expect(screen.getByRole('link', { name: 'Explore documentation' })).toHaveAttribute(
      'href',
      '/en/docs',
    )
  })

  it('does not render retail or unsupported claims', () => {
    const { container } = render(
      <MemoryRouter>
        <Landing locale="pt" />
      </MemoryRouter>,
    )
    expect(container.textContent).not.toMatch(
      /compre usdt|taxas competitivas|99,9%|dólares digitais/i,
    )
  })

  it('presents the fixed settlement events as a demonstration, not links', () => {
    render(
      <MemoryRouter>
        <Landing locale="pt" />
      </MemoryRouter>,
    )
    const eventList = screen.getByText('payment.created').closest('ol')
    expect(eventList).not.toBeNull()
    expect(within(eventList!).getAllByRole('listitem')).toHaveLength(3)
    expect(within(eventList!).getByText('BRL 1.250,00')).toBeInTheDocument()
    expect(within(eventList!).getByText('simulado')).toBeInTheDocument()
    expect(within(eventList!).getByText('0x71...9c')).toBeInTheDocument()
    expect(within(eventList!).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('TESTNET')).toBeInTheDocument()
  })

  it('keeps the infrastructure sequence understandable without connectors', () => {
    render(
      <MemoryRouter>
        <Landing locale="pt" />
      </MemoryRouter>,
    )
    const infrastructure = document.querySelector<HTMLElement>('#infraestrutura')
    expect(infrastructure).not.toBeNull()
    const nodes = within(infrastructure!).getAllByRole('listitem')
    expect(nodes).toHaveLength(4)
    expect(nodes.map((node) => node.textContent)).toEqual([
      '01Cliente B2B',
      '02Pix simulado',
      '03Orquestração Peragus',
      '04MockUSDT na Amoy',
    ])
  })

  it('composes the eight approved sections in order', () => {
    render(
      <MemoryRouter>
        <Landing locale="pt" />
      </MemoryRouter>,
    )
    const sections = screen.getByRole('main').querySelectorAll(':scope > section')
    expect([...sections].map((section) => section.id)).toEqual([
      '',
      '',
      'como-funciona',
      'produto',
      '',
      'infraestrutura',
      'seguranca',
      '',
    ])
  })
})
