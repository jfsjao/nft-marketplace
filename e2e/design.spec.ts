import { test, expect } from './fixtures'

test('telas Kurio cabem em 390, 768 e 1440 pixels', async ({ page }) => {
  test.setTimeout(90_000)
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/nft/nft-1', '/login', '/register']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true)
    }
  }
})

test('drawer mobile prende o foco e devolve ao gatilho ao fechar com Esc', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole('button', { name: 'Abrir menu' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Menu Kurio' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Fechar menu' }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('link', { name: 'Início' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(
    dialog.getByRole('button', { name: 'Fechar menu' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  const filters = page.getByRole('button', { name: 'Filtros', exact: true })
  await filters.click()
  await expect(
    page.getByRole('dialog', { name: 'Filtros do catálogo' }),
  ).toBeVisible()
  await page.getByRole('checkbox', { name: /^ethereum/ }).check()
  await page.getByRole('button', { name: 'Ver resultados' }).click()
  await expect(filters).toBeFocused()
  await expect(page).toHaveURL(/networks/)
})

test('Comprar NFT adiciona o item e preserva o retorno para o checkout', async ({
  page,
}) => {
  await page.goto('/nft/nft-1')
  await page.getByRole('button', { name: 'Comprar NFT', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await expect(
    page.getByRole('link', { name: 'Carrinho (1)', exact: true }),
  ).toBeVisible()
})
