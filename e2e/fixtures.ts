import { test as base, expect, type Page } from '@playwright/test'
import type {} from '../src/mocks/scenario'

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/')
    await page.waitForFunction(() => !!window.__kurioMock)
    await page.evaluate(async () => {
      await window.__kurioMock.reset()
      localStorage.removeItem('kurio:session')
    })
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Catálogo', exact: true }),
    ).toBeVisible()
    await use(page)
  },
})
export { expect }

export async function login(page: Page, email = 'colecionador@kurio.dev') {
  if (new URL(page.url()).pathname !== '/login') await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Sair', exact: true }),
  ).toBeVisible()
}

export async function addToCart(page: Page) {
  await page.getByLabel('Ordenação').selectOption('price-desc')
  await page.getByRole('link', { name: /Emerald Ape #042/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Adicionar ao carrinho', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('Adicionado ao carrinho.')
  await page.goto('/cart')
  await expect(
    page.getByRole('heading', { name: /Emerald Ape #042/ }),
  ).toBeVisible()
}

export async function checkout(page: Page) {
  await addToCart(page)
  await page.getByRole('link', { name: 'Finalizar', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Entrar', exact: true }),
  ).toBeVisible()
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Checkout', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Carteira', { exact: true }).selectOption('wallet-1')
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
  await expect(
    page.getByRole('region', { name: 'Revisão do pedido' }),
  ).toBeVisible()
}

export async function confirmed(page: Page) {
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(
    page.getByRole('heading', { name: 'Pagamento confirmado', exact: true }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('listitem')).toContainText(['Emerald Ape #042'])
  await expect(page.getByText('1.206 ETH', { exact: true })).toBeVisible()
  await expect(page.getByText(/^Transação: 0x/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Ver no explorador' }),
  ).toHaveAttribute('href', /^https:\/\//)
}
