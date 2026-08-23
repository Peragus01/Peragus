import { describe, expect, it } from 'vitest'
import { LOCALES } from '@/i18n/routing'
import { homeContent } from './index'

describe('localized homepage content', () => {
  it('defines every locale', () => {
    expect(Object.keys(homeContent).sort()).toEqual([...LOCALES].sort())
  })

  it.each(LOCALES)('keeps sandbox limits visible in %s', (locale) => {
    const serialized = JSON.stringify(homeContent[locale]).toLowerCase()
    expect(serialized).toContain('mockusdt')
    expect(serialized).toContain('polygon amoy')
  })

  it.each([
    ['pt', /sem movimentação de fundos reais/i, /mockusdt não é usdt/i],
    ['es', /sin movimiento de fondos reales/i, /mockusdt no es usdt/i],
    ['en', /no real funds are moved/i, /mockusdt is not usdt/i],
  ] as const)('puts both sandbox facts in the %s hero', (locale, funds, asset) => {
    const microDisclosure = homeContent[locale].hero.microDisclosure
    expect(microDisclosure).toMatch(funds)
    expect(microDisclosure).toMatch(asset)
  })

  it.each(LOCALES)('does not use unsupported claims in %s', (locale) => {
    const serialized = JSON.stringify(homeContent[locale]).toLowerCase()
    for (const claim of ['99,9%', 'instantâneo', 'instantáneo', 'instant', 'taxas competitivas', 'competitive rates', 'dólares digitais', 'dólares digitales']) {
      expect(serialized).not.toContain(claim)
    }
  })
})
