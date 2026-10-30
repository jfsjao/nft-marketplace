import { test, expect } from './fixtures'

test('faz login usando somente o teclado', async ({ page }) => {
  await page.goto('/login')
  const email = page.getByLabel('E-mail', { exact: true })
  for (let index = 0; index < 20; index++) {
    if (await email.evaluate((element) => element === document.activeElement))
      break
    await page.keyboard.press('Tab')
  }
  await expect(email).toBeFocused()
  await page.keyboard.type('colecionador@kurio.dev')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
  await page.keyboard.type('kurio123')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
})

test('mostra foco visível no primeiro link', async ({ page }) => {
  await page.keyboard.press('Tab')
  const firstLink = page.getByRole('link', { name: 'KURIO', exact: true })
  await expect(firstLink).toBeFocused()
  await expect
    .poll(() =>
      firstLink.evaluate((element) => {
        const style = getComputedStyle(element)
        return style.outlineStyle !== 'none' && style.outlineWidth !== '0px'
      }),
    )
    .toBe(true)
})

test('Esc fecha o drawer de filtros e devolve o foco', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true })
  await trigger.click()
  await expect(
    page.getByRole('dialog', { name: 'Filtros do catálogo' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Filtros do catálogo' }),
  ).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('erros de formulário são associados por aria-describedby', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  const email = page.getByLabel('E-mail', { exact: true })
  const password = page.getByLabel('Senha', { exact: true })
  await expect(email).toHaveAttribute('aria-describedby', 'email-error')
  await expect(password).toHaveAttribute('aria-describedby', 'password-error')
  await expect(page.getByText('E-mail inválido', { exact: true })).toBeVisible()
  await expect(page.getByText('Informe a senha', { exact: true })).toBeVisible()
})
