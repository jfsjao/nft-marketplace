import {
  sessionSchema,
  type Session,
  type LoginInput,
  type RegisterInput,
} from '@/domain/auth'
import * as auth from '@/api/auth'
import { configureSession } from '@/api/client'
import { apiErrorSchema } from '@/domain/errors'
import { validateRedirect } from '@/routes/redirect'
import type { QueryClient } from '@tanstack/react-query'

export function createSessionStore(storage: Storage = localStorage) {
  let saved: Session | null = null
  try {
    saved = sessionSchema.parse(
      JSON.parse(storage.getItem('kurio:session') ?? 'null'),
    )
  } catch {
    /* Persistência inválida não autentica. */
  }
  const newGuest = () => {
    const id = crypto.randomUUID()
    storage.setItem('kurio:guest-id', id)
    return id
  }
  let state = {
    session: saved,
    status: (saved ? 'unknown' : 'guest') as
      'unknown' | 'authenticated' | 'guest',
    guestId: storage.getItem('kurio:guest-id') || newGuest(),
    generation: 0,
    returnTo: undefined as string | undefined,
  }
  const listeners = new Set<() => void>()
  let queryClient: QueryClient | undefined
  let disconnect = () => {}
  let currentPath = () =>
    typeof location === 'undefined'
      ? '/'
      : `${location.pathname}${location.search}${location.hash}`
  const update = (patch: Partial<typeof state>) => {
    state = { ...state, ...patch }
    if (state.session)
      storage.setItem('kurio:session', JSON.stringify(state.session))
    else storage.removeItem('kurio:session')
    listeners.forEach((listener) => listener())
  }
  const clear = () => {
    void queryClient?.cancelQueries()
    queryClient?.clear()
    disconnect()
    update({
      session: null,
      status: 'guest',
      guestId: newGuest(),
      generation: state.generation + 1,
      returnTo: validateRedirect(currentPath()),
    })
  }
  let bootstrap: Promise<void> | undefined
  async function authenticate(action: () => Promise<Session>) {
    const generation = state.generation
    const guestId = state.guestId
    const result = await action()
    if (generation !== state.generation) return
    // Junta o carrinho antes de expor a sessão: navegar cedo não perde os itens.
    await auth.mergeCart(guestId, result.token)
    if (generation !== state.generation) return
    void queryClient?.cancelQueries()
    queryClient?.clear()
    disconnect()
    update({
      session: result,
      status: 'authenticated',
      generation: generation + 1,
      guestId: newGuest(),
    })
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    configure(client: QueryClient, path?: () => string) {
      queryClient = client
      if (path) currentPath = path
    },
    setRealtime(close: () => void) {
      disconnect = close
    },
    activate() {
      configureSession({
        getCredentials: () => ({
          token: state.session?.token,
          guestId: state.guestId,
          generation: state.generation,
        }),
        onUnauthorized: clear,
      })
    },
    ready() {
      if (!bootstrap)
        bootstrap = (async () => {
          if (state.status !== 'unknown') return
          const generation = state.generation
          try {
            const result = await auth.getSession()
            if (generation === state.generation)
              update({ session: result, status: 'authenticated' })
          } catch (error) {
            const parsed = apiErrorSchema.safeParse(error)
            if (parsed.success && parsed.data.code === 'UNAUTHORIZED') {
              if (generation === state.generation) clear()
              return
            }
            bootstrap = undefined
            throw error
          }
        })()
      return bootstrap
    },
    login: (input: LoginInput) => authenticate(() => auth.login(input)),
    register: (input: RegisterInput) =>
      authenticate(() => auth.register(input)),
    async logout() {
      const request = auth.logout()
      clear()
      await request.catch(() => {})
    },
    clear,
  }
}
export const sessionStore = createSessionStore()
sessionStore.activate()
