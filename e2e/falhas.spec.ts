import { test, expect, checkout, confirmed } from './fixtures'

test('payment-declined mostra recusa sem recibo confirmado', async ({
  page,
}) => {
  await checkout(page)
  await page.evaluate(() => window.__kurioMock.setScenario('payment-declined'))
  await page.getByRole('button', { name: 'Aceitar e enviar pedido' }).click()
  await expect(page.getByRole('alert')).toContainText('Pagamento recusado', {
    timeout: 15_000,
  })
  await expect(
    page.getByRole('heading', { name: 'Pagamento confirmado' }),
  ).toHaveCount(0)
})

test('order-timeout recupera o mesmo pedido e tentativa', async ({ page }) => {
  await checkout(page)
  await page.evaluate(() => window.__kurioMock.setScenario('order-timeout'))
  const requests: { key: string | undefined; body: string | null }[] = []
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname.endsWith('/orders')
    )
      requests.push({
        key: request.headers()['idempotency-key'],
        body: request.postData(),
      })
  })
  await page.getByRole('button', { name: 'Aceitar e enviar pedido' }).click()
  await expect(page.getByRole('alert')).toContainText('Resultado desconhecido')
  await page.reload()
  await confirmed(page)
  expect(requests).toHaveLength(2)
  expect(requests[0].key).toBeTruthy()
  expect(requests[1]).toEqual(requests[0])
  const orderUrl = page.url()
  await page.reload()
  await confirmed(page)
  await expect(page).toHaveURL(orderUrl)
})

test('price-change invalida revisão e exige novo aceite', async ({ page }) => {
  await checkout(page)
  await page.evaluate(() => window.__kurioMock.setScenario('price-change'))
  await page.getByRole('button', { name: 'Atualizar cotação' }).click()
  await page
    .getByRole('button', { name: 'Revisar pedido', exact: true })
    .click()
  await expect(
    page.getByRole('region', { name: 'Revisão do pedido' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(
    'Preço ou estoque alterado',
    { timeout: 10_000 },
  )
  await expect(
    page.getByRole('button', { name: 'Aceitar e enviar pedido' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Revisar pedido', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Atualizar cotação' }).click()
  await expect(
    page.getByLabel('Resumo do pedido').getByText('1.306 ETH', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Aceitar e enviar pedido' }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Revisar pedido', exact: true })
    .click()
  await page.getByRole('button', { name: 'Aceitar e enviar pedido' }).click()
  await expect(
    page.getByRole('heading', { name: 'Pagamento confirmado' }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByLabel('Resumo do pedido').getByText('1.306 ETH', { exact: true }),
  ).toBeVisible()
})
