import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  defaultParseSearch,
  redirect,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import App from './App'
import { sessionStore } from './features/session/store'
import { Login } from './routes/login'
import { Register } from './routes/register'
import DesignSystemPreview from './routes/design'
import { Placeholder } from './routes/placeholder'
import { loginSearchSchema, validateRedirect } from './routes/redirect'
import { catalogSearchSchema } from './features/catalog/search'
import { Catalog } from './routes/catalog'
import { Nft } from './routes/nft'
import { Cart } from './routes/cart'

export interface RouterContext {
  queryClient: QueryClient
  auth: {
    userId: string | null
    status: 'unknown' | 'authenticated' | 'guest'
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: App,
  notFoundComponent: () => <Placeholder title="Página não encontrada" />,
})

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => catalogSearchSchema.parse(search),
  component: Catalog,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: Nft,
})

async function requireAuth({
  context,
  location,
}: {
  context: RouterContext
  location: { href: string }
}) {
  if (context.auth.status === 'unknown')
    await sessionStore.ready().catch((error) => {
      if (sessionStore.getSnapshot().status === 'unknown') throw error
    })
  const auth = sessionStore.getSnapshot()
  if (auth.status !== 'authenticated' || !auth.session?.user.id) {
    throw redirect({
      to: '/login',
      search: { redirect: validateRedirect(location.href) ?? '/' },
    })
  }
}

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: Cart,
})
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireAuth,
  component: () => <Placeholder title="Pagamento" />,
})
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireAuth,
  component: () => (
    <Placeholder
      title="Confirmação de pedido"
      parameters={orderRoute.useParams()}
    />
  ),
})
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: Login,
})
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: Register,
})
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireAuth,
  component: () => <Placeholder title="Perfil do colecionador" />,
})
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  beforeLoad: requireAuth,
  component: () => <Placeholder title="Carteiras" />,
})
const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/__design',
  component: DesignSystemPreview,
})

export const router = createRouter({
  parseSearch: (search) => {
    const parsed: Record<string, unknown> = { ...defaultParseSearch(search) }
    const params = new URLSearchParams(search)
    for (const key of ['min', 'max']) {
      if (typeof parsed[key] === 'number') parsed[key] = params.get(key)
    }
    return parsed
  },
  routeTree: rootRoute.addChildren([
    catalogRoute,
    nftRoute,
    cartRoute,
    checkoutRoute,
    orderRoute,
    loginRoute,
    registerRoute,
    profileRoute,
    walletsRoute,
    designRoute,
  ]),
  context: { queryClient: undefined!, auth: { userId: null, status: 'guest' } },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
