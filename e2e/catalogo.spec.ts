import { test, expect } from './fixtures'

test('busca, filtros e ordenação persistem na URL e no histórico', async ({
  page,
}) => {
  await page.goto('/?q=%23')
  await page.getByRole('checkbox', { name: /^ethereum/ }).check()
  await page.getByLabel('Ordenação').selectOption('price-asc')
  await expect(page.getByRole('button', { name: 'Próxima' })).toBeEnabled()
  const firstPage = page.url()
  const firstItem = await page
    .getByRole('heading', { level: 2 })
    .first()
    .textContent()
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/[?&]page=2(?:&|$)/)
  await expect(page.getByText(/^Página 2 de/)).toBeVisible()
  const secondPage = page.url()
  expect(new URL(secondPage).searchParams.get('q')).toBe('#')
  expect(new URL(secondPage).searchParams.get('networks')).toContain('ethereum')
  expect(new URL(secondPage).searchParams.get('sort')).toBe('price-asc')
  const secondItem = await page
    .getByRole('heading', { level: 2 })
    .first()
    .textContent()
  expect(secondItem).not.toBe(firstItem)
  await page.reload()
  await expect(page).toHaveURL(secondPage)
  await expect(page.getByLabel('Busca', { exact: true })).toHaveValue('#')
  await expect(page.getByRole('checkbox', { name: /^ethereum/ })).toBeChecked()
  await expect(page.getByLabel('Ordenação')).toHaveValue('price-asc')
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
    secondItem!,
  )
  await page.goBack()
  await expect(page).toHaveURL(firstPage)
  await expect(page.getByText(/^Página 1 de/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
    firstItem!,
  )
})

test('detalhe inexistente informa não encontrado', async ({ page }) => {
  await page.goto('/nft/inexistente')
  await expect(page.getByRole('alert')).toContainText('NFT não encontrado')
})

test('botão Buscar aplica a busca digitada', async ({ page }) => {
  test.fixme(
    true,
    'Catalog usa Button sem type="submit"; Button assume type="button", então Buscar não envia o formulário.',
  )
  await page.getByLabel('Busca', { exact: true }).fill('Emerald')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page).toHaveURL(/[?&]q=Emerald(?:&|$)/)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Emerald Ape #042',
  ])
})
