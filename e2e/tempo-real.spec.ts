import { test, expect, checkout } from './fixtures'

test('evento duplicado ou antigo não regride o NFT', async ({ page }) => {
  await page.goto('/nft/nft-1')
  await expect(
    page.getByText('1.19 ETH', { exact: true }).first(),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.__kurioMock.connectedSockets()))
    .toBeGreaterThan(0)

  const older = await page.evaluate(() =>
    window.__kurioMock.changeEdition('nft-1', 'nft-1-edition-1', {
      priceEth: '1.29',
    }),
  )
  await expect(
    page.getByText('1.29 ETH', { exact: true }).first(),
  ).toBeVisible()
  const newest = await page.evaluate(() =>
    window.__kurioMock.changeEdition('nft-1', 'nft-1-edition-1', {
      priceEth: '1.39',
    }),
  )
  await expect(
    page.getByText('1.39 ETH', { exact: true }).first(),
  ).toBeVisible()

  await page.evaluate(
    ({ duplicate, stale }) => {
      window.__kurioMock.replayEvent(duplicate)
      window.__kurioMock.replayEvent(stale, `${stale.eventId}-replay`)
    },
    { duplicate: newest, stale: older },
  )
  await expect(
    page.getByText('1.39 ETH', { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText('1.29 ETH', { exact: true }).first()).toHaveCount(
    0,
  )
})

test('desconexão e reload recuperam o mesmo pedido pendente', async ({
  page,
}) => {
  await checkout(page)
  await page.getByRole('button', { name: 'Aceitar e enviar pedido' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  const orderUrl = page.url()
  await expect(page.getByRole('status')).toHaveText(
    'Aguardando confirmação do pagamento.',
  )
  await page.evaluate(() => window.__kurioMock.disconnectSockets())

  await page.reload()
  await expect(page).toHaveURL(orderUrl)
  await expect(
    page.getByRole('heading', { name: 'Pagamento confirmado' }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(orderUrl)
})
