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
