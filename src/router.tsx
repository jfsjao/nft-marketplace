import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  defaultParseSearch,
  lazyRouteComponent,
  redirect,
  stripSearchParams,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import App from './App'
import { sessionStore } from './features/session/store'
import { Placeholder } from './routes/placeholder'
import { loginSearchSchema, validateRedirect } from './routes/redirect'
import { catalogSearchSchema } from './features/catalog/search'
import { Catalog } from './routes/catalog'

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
  validateSearch: catalogSearchSchema,
  // Tira da URL os filtros no valor padrão: o link fica curto e igual ao inicial.
  search: {
    middlewares: [stripSearchParams(catalogSearchSchema.parse({}))],
  },
  component: Catalog,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: lazyRouteComponent(() => import('./routes/nft'), 'Nft'),
})

async function requireAuth({ location }: { location: { href: string } }) {
  // O contexto do router pode estar desatualizado no primeiro load; a sessão é a fonte.
  if (sessionStore.getSnapshot().status === 'unknown')
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
  component: lazyRouteComponent(() => import('./routes/cart'), 'Cart'),
})
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('./routes/checkout'), 'Checkout'),
})
const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('./routes/order'), 'Order'),
})
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: lazyRouteComponent(() => import('./routes/login'), 'Login'),
})
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: lazyRouteComponent(() => import('./routes/register'), 'Register'),
})
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('./routes/profile'), 'Profile'),
})
const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('./routes/wallets'), 'Wallets'),
})
const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/__design',
  component: lazyRouteComponent(() => import('./routes/design')),
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
