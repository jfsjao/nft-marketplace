import { test, expect } from './fixtures'

test('latência lenta mostra skeleton acessível antes dos dados', async ({
  page,
}) => {
  await page.evaluate(() => window.__kurioMock.setScenario({ latency: 'slow' }))
  await page.goto('/?q=Emerald')
  await expect(
    page.getByRole('status', { name: 'Carregando catálogo' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
})

test('erro 503 no catálogo permite tentar novamente', async ({ page }) => {
  await page.evaluate(() =>
    window.__kurioMock.setScenario({
      failures: [
        {
          route: 'GET /nfts',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          // -1: falha até limpar; com 1 só o retry automático já recupera.
          times: -1,
        },
      ],
    }),
  )
  await page.goto('/?q=Emerald')
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar o catálogo.',
  )
  await page.evaluate(() => window.__kurioMock.setScenario({ failures: [] }))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
})
