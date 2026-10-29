import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import App from './App'
import DesignSystemPreview from './routes/design'
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
  validateSearch: (search) => catalogSearchSchema.parse(search),
  component: Catalog,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: () => (
    <Placeholder title="Detalhes do NFT" parameters={nftRoute.useParams()} />
  ),
})

function requireAuth({
  context,
  location,
}: {
  context: RouterContext
  location: { href: string }
}) {
  if (context.auth.status !== 'authenticated' || !context.auth.userId) {
    throw redirect({
      to: '/login',
      search: { redirect: validateRedirect(location.href) ?? '/' },
    })
  }
}

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: () => <Placeholder title="Carrinho" />,
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
  component: () => (
    <Placeholder title="Login" parameters={loginRoute.useSearch()} />
  ),
})
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => <Placeholder title="Cadastro" />,
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
