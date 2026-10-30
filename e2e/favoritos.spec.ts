import { test, expect, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/nft/nft-1')
  await page.waitForFunction(() => !!window.__kurioMock)
})

test('favorito persiste após recarregar', async ({ page }) => {
  const favorite = page.getByRole('button', { name: 'Favoritar' })
  await favorite.click()
  await expect(
    page.getByRole('button', { name: 'Remover favorito' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Remover favorito' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('falha da mutation desfaz a atualização otimista e anuncia o erro', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__kurioMock.setScenario({
      failures: [
        {
          route: 'PUT /favorites/:nftId',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          times: 1,
        },
      ],
    }),
  )
  await page.getByRole('button', { name: 'Favoritar' }).click()

  await expect(page.getByRole('alert')).toHaveText(
    'Não foi possível atualizar favorito. Tente novamente.',
  )
  await expect(page.getByRole('button', { name: 'Favoritar' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})
