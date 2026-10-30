import { test, expect, checkout, confirmed } from './fixtures'

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

test('compra e conta cabem em 390, 768 e 1440 pixels', async ({ page }) => {
  test.setTimeout(120_000)
  await checkout(page)
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/cart', '/checkout', '/profile', '/wallets']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Tentar novamente' }),
      ).toHaveCount(0)
      if (path === '/cart')
        await expect(
          page.getByRole('heading', { name: /Emerald Ape/ }),
        ).toBeVisible()
      if (path === '/checkout')
        await expect(
          page.getByLabel('Nome de exibição', { exact: true }),
        ).toBeVisible()
      if (path === '/profile')
        await expect(
          page.getByRole('button', { name: 'Salvar perfil', exact: true }),
        ).toBeVisible()
      if (path === '/wallets')
        await expect(
          page.getByRole('button', {
            name: 'Salvar carteira principal',
            exact: true,
          }),
        ).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
    }
  }
  await page.goto('/checkout')
  await page
    .getByRole('combobox', { name: 'Carteira', exact: true })
    .selectOption('wallet-1')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('status')).toContainText('Conectada:')
  for (const [label, value] of Object.entries({
    'Nome de exibição': 'Colecionador',
    Usuário: 'colecionador',
    'Nome do perfil': 'Colecionador E2E',
    'E-mail': 'colecionador@kurio.dev',
    'Código de indicação': 'KURIO',
    'Nome ENS': 'colecionador.eth',
  }))
    await page.getByLabel(label, { exact: true }).fill(value)
  await page
    .getByRole('button', { name: 'Revisar pedido', exact: true })
    .click()
  await page.getByRole('button', { name: 'Aceitar e enviar pedido' }).click()
  await confirmed(page)
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true)
  }
})
