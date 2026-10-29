import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { api, configureSession } from './client'

const server = setupServer()
const unauthorized = vi.fn()
beforeAll(() => {
  api.defaults.baseURL = 'http://localhost/api'
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})
afterAll(() => server.close())
function configure(token?: string) {
  configureSession({
    getCredentials: () => ({ token, guestId: 'guest-1', generation: 1 }),
    onUnauthorized: unauthorized,
  })
}
it('envia Bearer e sempre identifica o visitante', async () => {
  server.use(
    http.get('*/api/profile', ({ request }) =>
      HttpResponse.json({
        token: request.headers.get('Authorization'),
        guest: request.headers.get('X-Guest-Id'),
      }),
    ),
  )
  configure('token-1')
  expect((await api.get('/profile')).data).toEqual({
    token: 'Bearer token-1',
    guest: 'guest-1',
  })
  configure()
  expect((await api.get('/profile')).data).toEqual({
    token: null,
    guest: 'guest-1',
  })
})
it('401 privado chama callback e devolve ApiError; login não encerra sessão', async () => {
  configure('token-1')
  const error = { code: 'UNAUTHORIZED', message: 'Expirada', requestId: 'r1' }
  server.use(
    http.get('*/api/profile', () => HttpResponse.json(error, { status: 401 })),
    http.post('*/api/auth/login', () =>
      HttpResponse.json(error, { status: 401 }),
    ),
  )
  await expect(api.get('/profile')).rejects.toEqual(error)
  expect(unauthorized).toHaveBeenCalledTimes(1)
  await expect(api.post('/auth/login')).rejects.toEqual(error)
  expect(unauthorized).toHaveBeenCalledTimes(1)
})
it.each(['invalid', 'network'])(
  'converte falha %s em SERVICE_UNAVAILABLE',
  async (kind) => {
    configure()
    server.use(
      http.get('*/api/profile', () =>
        kind === 'network'
          ? HttpResponse.error()
          : HttpResponse.text('erro', { status: 500 }),
      ),
    )
    await expect(api.get('/profile')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      requestId: expect.any(String),
    })
  },
)
