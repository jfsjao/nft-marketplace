import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { api } from '@/api/client'
import { sessionStore } from '@/features/session/store'
import { AuthForm } from '@/features/session/auth-form'

const server = setupServer(
  http.post('*/api/auth/login', () =>
    HttpResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'Credenciais inválidas',
        requestId: 'r1',
        fieldErrors: { email: ['Confira o e-mail'] },
      },
      { status: 401 },
    ),
  ),
)
beforeAll(() => {
  api.defaults.baseURL = 'http://localhost/api'
  sessionStore.activate()
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(cleanup)
afterAll(() => server.close())
it('mostra credencial inválida e associa o erro ao campo', async () => {
  const user = userEvent.setup()
  const onSuccess = vi.fn()
  render(<AuthForm mode="login" onSuccess={onSuccess} />)
  await user.type(screen.getByLabelText('E-mail'), 'teste@example.com')
  await user.type(screen.getByLabelText('Senha'), 'senha errada')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Credenciais inválidas',
  )
  expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
    'E-mail ou senha incorretos',
  )
  expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
    'Confira o e-mail',
  )
  expect(onSuccess).not.toHaveBeenCalled()
})
