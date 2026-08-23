import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageMetadata } from './PageMetadata'

describe('PageMetadata', () => {
  it('updates localized canonical and language metadata', () => {
    render(
      <PageMetadata
        locale="es"
        title="Peragus | Sandbox B2B"
        description="Descripción de prueba"
        canonicalPath="/es"
        alternates={{ pt: '/', es: '/es', en: '/en' }}
      />,
    )

    expect(document.documentElement.lang).toBe('es')
    expect(document.title).toBe('Peragus | Sandbox B2B')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://peragus.com.br/es',
    )
    expect(document.querySelector('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      'es_419',
    )
    expect(document.querySelectorAll('link[rel="alternate"]')).toHaveLength(3)
  })

  it('reuses managed metadata nodes across route changes', () => {
    const { rerender } = render(
      <PageMetadata
        locale="pt"
        title="Título em português"
        description="Descrição em português"
        canonicalPath="/"
        alternates={{ pt: '/', es: '/es', en: '/en' }}
      />,
    )

    const managedNodes = Array.from(
      document.head.querySelectorAll<HTMLElement>('[data-peragus-meta]'),
    )

    rerender(
      <PageMetadata
        locale="en"
        title="English title"
        description="English description"
        canonicalPath="/en"
        alternates={{ pt: '/', es: '/es', en: '/en' }}
      />,
    )

    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('English title')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'English description',
    )
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://peragus.com.br/en',
    )
    expect(document.head.querySelectorAll('[data-peragus-meta]')).toHaveLength(
      managedNodes.length,
    )
    managedNodes.forEach((node) => expect(document.head).toContainElement(node))
  })
})
