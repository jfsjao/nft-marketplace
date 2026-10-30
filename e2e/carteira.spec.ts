import { test, expect, addToCart, login } from './fixtures'

async function openCheckout(page: Parameters<typeof login>[0]) {
  await addToCart(page)
  await page.getByRole('link', { name: 'Finalizar', exact: true }).click()
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Checkout', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Carteira', exact: true })
    .selectOption('wallet-1')
}

test('conecta e desconecta a carteira', async ({ page }) => {
  await openCheckout(page)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('status')).toContainText('Conectada: 0x1111…1111')

  await page.getByRole('button', { name: 'Desconectar' }).click()
  await expect(
    page.getByRole('button', { name: 'Conectar carteira' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Revisar pedido' }),
  ).toBeDisabled()
})

test('recusa da carteira impede o envio', async ({ page }) => {
  await openCheckout(page)
  await page.evaluate(() => window.__kurioMock.setScenario('wallet-rejected'))
  await page.getByRole('button', { name: 'Conectar carteira' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'Conexão recusada na carteira',
  )
  await expect(
    page.getByRole('button', { name: 'Revisar pedido' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Aceitar e enviar pedido' }),
  ).toHaveCount(0)
})
