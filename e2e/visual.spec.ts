import type { Locator, Page } from '@playwright/test'
import { test, expect, addToCart, login } from './fixtures'

async function ready(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const images = Array.from(document.images)
    for (const image of images) image.loading = 'eager'
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) return resolve()
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    )
  })
}

async function screenshot(page: Page, name: string, mask: Locator[] = []) {
  await ready(page)
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    fullPage: true,
    mask,
  })
}

test('regressão visual das telas principais', async ({ page }) => {
  test.setTimeout(120_000)
  await page.evaluate(() => window.__kurioMock.setScenario('default'))
  await screenshot(page, 'inicio.png')

  await page.goto('/nft/nft-1')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
  await screenshot(page, 'detalhe.png')

  await page.goto('/')
  await addToCart(page)
  await screenshot(page, 'carrinho.png')

  await page.getByRole('link', { name: 'Finalizar', exact: true }).click()
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Checkout', exact: true }),
  ).toBeVisible()
  await screenshot(page, 'pagamento.png')
})
