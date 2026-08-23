import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'
import { Notice } from './notice'
import { SectionHeading } from './section-heading'

describe('B1 primitives', () => {
  it('renders a semantic button with the mint primary treatment', () => {
    render(<Button>Acessar sandbox</Button>)
    const button = screen.getByRole('button', { name: 'Acessar sandbox' })
    expect(button).toHaveClass('bg-mint', 'text-[#08211e]')
  })

  it('renders sandbox notices with explicit semantics', () => {
    render(<Notice tone="sandbox">MockUSDT não possui valor financeiro.</Notice>)
    expect(screen.getByRole('note')).toHaveTextContent(/não possui valor financeiro/i)
  })

  it('keeps heading hierarchy configurable', () => {
    render(<SectionHeading eyebrow="Fluxo" title="Tres estados" as="h2" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Tres estados' })).toBeInTheDocument()
  })
})
