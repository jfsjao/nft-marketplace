import { test, expect, login, addToCart } from './fixtures'

test('login incorreto mostra erro', async ({ page }) => {
  await page.goto('/login')
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('colecionador@kurio.dev')
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(
    page.getByText('E-mail ou senha incorretos', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
})

test('trocar usuário isola carrinho e identidade', async ({ page }) => {
  await addToCart(page)
  await login(page)
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: /Emerald Ape #042/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await login(page, 'segundo@kurio.dev')
  await expect(page.getByRole('banner')).toContainText('Segundo colecionador')
  await page.goto('/cart')
  await expect(
    page.getByText('Seu carrinho está vazio.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Emerald Ape #042/ }),
  ).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByText('Seu carrinho está vazio.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await login(page)
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: /Emerald Ape #042/ }),
  ).toBeVisible()
})
