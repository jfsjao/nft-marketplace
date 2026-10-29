import axios from 'axios'
import { apiErrorSchema, type ApiError } from '@/domain/errors'

export const api = axios.create({ baseURL: '/api', timeout: 10_000 })

let session = {
  getCredentials: (): {
    token?: string
    guestId: string
    generation: number
  } => ({
    guestId: '',
    generation: 0,
  }),
  onUnauthorized: () => {},
}

export function configureSession(options: typeof session) {
  session = options
}

const generations = new WeakMap<object, number>()
api.interceptors.request.use(
  (config) => {
    const { token, guestId, generation } = session.getCredentials()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    config.headers.set('X-Guest-Id', guestId)
    generations.set(config, generation)
    return config
  },
  undefined,
  { synchronous: true },
)
api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error)
  if (axios.isAxiosError(error)) {
    const path = error.config?.url?.split('?')[0]
    if (
      error.response?.status === 401 &&
      path !== '/auth/login' &&
      path !== '/auth/register' &&
      !path?.startsWith('/nfts') &&
      error.config &&
      generations.get(error.config) === session.getCredentials().generation
    )
      session.onUnauthorized()
    const parsed = apiErrorSchema.safeParse(error.response?.data)
    if (parsed.success) return Promise.reject(parsed.data)
  }
  const fallback: ApiError = {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Serviço indisponível. Tente novamente.',
    requestId: crypto.randomUUID(),
  }
  return Promise.reject(fallback)
})
