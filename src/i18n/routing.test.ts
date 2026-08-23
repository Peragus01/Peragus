import { describe, expect, it } from 'vitest'
import {
  homePath,
  localeFromPathname,
  pagePath,
  sandboxPath,
  sectionPath,
} from './routing'

describe('localized routing', () => {
  it('keeps Portuguese at the root', () => {
    expect(homePath('pt')).toBe('/')
    expect(pagePath('pt', 'terms')).toBe('/terms')
  })

  it('prefixes Spanish and English', () => {
    expect(homePath('es')).toBe('/es')
    expect(pagePath('en', 'privacy')).toBe('/en/privacy')
    expect(sandboxPath('es', 'register')).toBe('/es/register')
    expect(sectionPath('es', 'infraestrutura')).toBe('/es#infraestrutura')
  })

  it('reads locale only from a supported first path segment', () => {
    expect(localeFromPathname('/es/security')).toBe('es')
    expect(localeFromPathname('/en')).toBe('en')
    expect(localeFromPathname('/terms')).toBe('pt')
    expect(localeFromPathname('/fr')).toBe('pt')
  })
})
