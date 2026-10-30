import { beforeEach, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import * as auth from '@/api/auth'
import { createSessionStore } from './store'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getSession: vi.fn(),
  mergeCart: vi.fn(),
  logout: vi.fn(),
}))
const session = {
  token: 'token',
  expiresAt: '2030-01-01T00:00:00.000Z',
  user: {
    id: 'u1',
    username: 'teste',
    displayName: 'Teste',
    email: 'teste@example.com',
    version: 1,
  },
}
beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  vi.mocked(auth.logout).mockResolvedValue(undefined)
  vi.mocked(auth.login).mockResolvedValue(session)
  vi.mocked(auth.getSession).mockResolvedValue(session)
})
it('persiste sessão e visitante; restaura pelo bootstrap', async () => {
  const store = createSessionStore()
  const guest = store.getSnapshot().guestId
  await store.login({ email: session.user.email, password: 'senha' })
  expect(auth.mergeCart).toHaveBeenCalledWith(guest, 'token')
  expect(store.getSnapshot().guestId).not.toBe(guest)
  expect(JSON.parse(localStorage.getItem('kurio:session')!)).toEqual(session)
  const restored = createSessionStore()
  expect(restored.getSnapshot().status).toBe('unknown')
  expect(restored.getSnapshot().guestId).toBe(store.getSnapshot().guestId)
  await restored.ready()
  expect(restored.getSnapshot().status).toBe('authenticated')
})
it('logout limpa cache, socket e sessão, troca visitante e incrementa geração', async () => {
  const store = createSessionStore()
  const client = new QueryClient()
  store.configure(client, () => '/checkout?step=payment')
  await store.login({ email: session.user.email, password: 'senha' })
  const before = store.getSnapshot()
  const disconnect = vi.fn()
  store.setRealtime(disconnect)
  client.setQueryData(['private', 'u1'], 'segredo')
  await store.logout()
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(disconnect).toHaveBeenCalledOnce()
  expect(localStorage.getItem('kurio:session')).toBeNull()
  expect(store.getSnapshot()).toMatchObject({
    session: null,
    status: 'guest',
    generation: before.generation + 1,
    returnTo: '/checkout?step=payment',
  })
  expect(store.getSnapshot().guestId).not.toBe(before.guestId)
})
it('não troca visitante quando merge falha', async () => {
  const store = createSessionStore()
  const guest = store.getSnapshot().guestId
  vi.mocked(auth.mergeCart).mockRejectedValue({ code: 'SERVICE_UNAVAILABLE' })
  await expect(
    store.login({ email: session.user.email, password: 'senha' }),
  ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  expect(store.getSnapshot().guestId).toBe(guest)
})
it('ignora resposta do login depois de encerrar a geração', async () => {
  let resolve!: (value: typeof session) => void
  vi.mocked(auth.login).mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const store = createSessionStore()
  const pending = store.login({ email: session.user.email, password: 'senha' })
  store.clear()
  resolve(session)
  await pending
  expect(store.getSnapshot().session).toBeNull()
  expect(auth.mergeCart).not.toHaveBeenCalled()
})

it('401 no bootstrap apaga sessão persistida e avança a geração', async () => {
  localStorage.setItem('kurio:session', JSON.stringify(session))
  vi.mocked(auth.getSession).mockRejectedValue({
    code: 'UNAUTHORIZED',
    message: 'Expirada',
    requestId: 'r1',
  })
  const store = createSessionStore()
  await store.ready()
  expect(store.getSnapshot()).toMatchObject({
    session: null,
    status: 'guest',
    generation: 1,
  })
  expect(localStorage.getItem('kurio:session')).toBeNull()
})
