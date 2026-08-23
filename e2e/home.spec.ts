import { expect, test } from '@playwright/test'

test('homepage exposes the factual sandbox flow without horizontal overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Pix no Brasil. Liquidação na sua carteira.' })).toBeVisible()
  await expect(page.getByRole('note').filter({ hasText: /mockusdt não é usdt/i })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
  expect(errors).toEqual([])
})

test('localized navigation preserves language', async ({ page }) => {
  await page.goto('/es')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Seguridad' }).click()
  await expect(page).toHaveURL(/\/es\/security$/)
})

test('legacy security-info route remains a 404', async ({ page }) => {
  await page.goto('/security-info')
  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('removes real section animation and smooth scrolling', async ({ page }) => {
    await page.goto('/')
    const hero = page.getByRole('heading', { level: 1 }).locator('..').locator('..')

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(hero).toHaveCSS('animation-name', 'section-enter')
    await expect(hero).toHaveCSS('animation-duration', '0.22s')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(hero).toHaveCSS('animation-name', 'none')
    await expect(hero).toHaveCSS('transform', 'none')
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto')
  })
})
