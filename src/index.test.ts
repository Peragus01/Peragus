/// <reference types="node" />
// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

describe('B1 design tokens', () => {
  it.each([
    '#06191d',
    '#0c272c',
    '#12353b',
    '#25474c',
    '#f1f7f5',
    '#a8bcb8',
    '#7f9b97',
    '#4de0bd',
    '#6680e8',
    '#e6c76d',
    '#ff8a8a',
  ])('contains approved token %s', (token) => {
    expect(css.toLowerCase()).toContain(token)
  })

  it('removes legacy Disney and looping animation language', () => {
    expect(css).not.toMatch(/Disney|valueFlow|shimmer|breathe/i)
  })

  it('contains reduced-motion handling', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
  })
})
