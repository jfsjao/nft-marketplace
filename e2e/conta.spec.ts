import { test, expect, login } from './fixtures'

test.beforeEach(async ({ page }) => {
  await login(page)
})

test('edita o perfil e mantém os dados após recarregar', async ({ page }) => {
  await page.goto('/profile')
  await page.getByLabel('Nome de exibição', { exact: true }).fill('JF E2E')
  await page.getByLabel('Apelido da carteira').fill('Carteira de testes')
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByRole('status')).toHaveText('Perfil salvo.')

  await page.reload()
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('JF E2E')
  await expect(page.getByLabel('Apelido da carteira')).toHaveValue(
    'Carteira de testes',
  )
})

test('associa conflito de usuário ao campo correspondente', async ({
  page,
}) => {
  await page.goto('/profile')
  const username = page.getByLabel('Usuário', { exact: true })
  await username.fill('segundo')
  await page.getByRole('button', { name: 'Salvar perfil' }).click()

  await expect(username).toHaveAttribute(
    'aria-describedby',
    'profile-username-error',
  )
  await expect(
    page.getByText('Usuário já cadastrado', { exact: true }),
  ).toHaveCount(2)
})

test('envia um avatar PNG pequeno', async ({ page }) => {
  await page.goto('/profile')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1pAAAAAASUVORK5CYII=',
    'base64',
  )
  await page.getByLabel('Imagem do avatar').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await page.getByRole('button', { name: 'Alterar', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Avatar alterado.')

  await page.reload()
  await expect(
    page.getByRole('img', { name: 'Avatar do perfil' }),
  ).toHaveAttribute('src', /^data:image\/png;base64,/)
})

test('mostra senha atual errada no campo', async ({ page }) => {
  await page.goto('/profile')
  const currentPassword = page.getByLabel('Senha atual')
  await currentPassword.fill('senha-incorreta')
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-123')
  await page.getByLabel('Confirme a nova senha').fill('nova-senha-123')
  await page.getByRole('button', { name: 'Alterar senha' }).click()

  await expect(currentPassword).toHaveAttribute(
    'aria-describedby',
    'password-currentPassword-error',
  )
  await expect(page.getByText('Senha incorreta', { exact: true })).toBeVisible()
})

test('salva carteira e valida endereço incompatível com a rede', async ({
  page,
}) => {
  await page.goto('/wallets')
  const primary = page
    .getByRole('heading', { name: 'Carteira principal' })
    .locator('..')
  const nickname = primary.getByLabel('Apelido', { exact: true })
  const address = primary.getByLabel('Endereço', { exact: true })
  const savedAddress = `0x${'a'.repeat(40)}`
  await nickname.fill('Principal E2E')
  await address.fill(savedAddress)
  await primary
    .getByRole('button', { name: 'Salvar carteira principal' })
    .click()
  await expect(primary.getByRole('status')).toHaveText('Carteira salva.')

  await page.reload()
  const reloaded = page
    .getByRole('heading', { name: 'Carteira principal' })
    .locator('..')
  await expect(reloaded.getByLabel('Apelido', { exact: true })).toHaveValue(
    'Principal E2E',
  )
  await expect(reloaded.getByLabel('Endereço', { exact: true })).toHaveValue(
    savedAddress,
  )

  await reloaded.getByLabel('Rede', { exact: true }).selectOption('solana')
  await reloaded
    .getByRole('button', { name: 'Salvar carteira principal' })
    .click()
  await expect(
    reloaded.getByLabel('Endereço', { exact: true }),
  ).toHaveAttribute('aria-describedby', 'primary-address-error')
  await expect(
    reloaded.getByText('Endereço incompatível com a rede', { exact: true }),
  ).toBeVisible()
})
