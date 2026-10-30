import { test, checkout, confirmed } from './fixtures'

test('compra do catálogo ao recibo confirmado', async ({ page }) => {
  await checkout(page)
  await page.getByRole('button', { name: 'Aceitar e enviar pedido' }).click()
  await confirmed(page)
  await page.reload()
  await confirmed(page)
})
