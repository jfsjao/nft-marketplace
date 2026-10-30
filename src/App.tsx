import { getCart } from './api/cart'
import { Button } from './components/ui/button'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from './components/ui/drawer'
import { Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSession } from './api/auth'
import { useCatalogRealtime } from './features/catalog/realtime'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useSession } from './features/session/use-session'

export default function App() {
  useCatalogRealtime()
  const { session, guestId, status, logout } = useSession()
  const refreshed = useQuery({
    queryKey: ['auth-session', session?.user.id],
    queryFn: getSession,
    enabled: status === 'authenticated',
    retry: false,
  })
  const location = useLocation()
  const authPage = ['/login', '/register'].includes(location.pathname)
  const cart = useQuery({
    queryKey: ['cart', session?.user.id ?? guestId],
    queryFn: ({ signal }) => getCart(signal),
    enabled: status !== 'unknown',
    retry: false,
  })
  const count =
    cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const navigation = (
    <>
      <a
        href="/"
        aria-current={location.pathname === '/' ? 'page' : undefined}
        className="py-4 aria-[current=page]:border-b-2 aria-[current=page]:border-primary aria-[current=page]:text-primary"
      >
        Início
      </a>
      <a href="/mercado" title="Fora do escopo desta versão">
        Mercado
      </a>
      <a href="/criadores" title="Fora do escopo desta versão">
        Criadores
      </a>
      <a href="/aprenda" title="Fora do escopo desta versão">
        Aprenda
      </a>
    </>
  )
  return (
    <>
      <header className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-3 border-b px-5 md:px-8">
        <Link
          to="/"
          search={{
            q: '',
            collections: [],
            networks: [],
            tab: 'all',
            sort: 'recent',
            page: 1,
          }}
        >
          <span className="font-bold tracking-widest">KURIO</span>
        </Link>
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-8 text-sm md:flex"
        >
          {navigation}
        </nav>
        <div className="flex min-w-0 items-center gap-1 text-sm md:gap-3">
          <a
            href="/#busca"
            aria-label="Buscar NFTs"
            className="grid size-10 place-items-center"
          >
            <img
              src="/assets/icons/interface/busca.svg"
              alt=""
              className="size-5"
            />
          </a>
          <Link
            to="/cart"
            aria-label={`Carrinho (${count})`}
            className="relative grid size-10 place-items-center"
          >
            <img
              src="/assets/icons/interface/carrinho.svg"
              alt=""
              className="size-6"
            />
            <span className="absolute top-0 right-0 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] text-primary-foreground">
              {count}
            </span>
          </Link>
          {status === 'authenticated' ? (
            <>
              <span className="max-w-16 truncate md:max-w-28 text-text-secondary">
                {refreshed.data?.user.displayName ?? session?.user.displayName}
              </span>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                Sair
              </Button>
            </>
          ) : (
            <Link
              className="rounded bg-primary px-3 py-2 text-primary-foreground"
              to="/login"
              search={{ redirect: undefined }}
            >
              Entrar
            </Link>
          )}
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menu"
                className="md:hidden"
              >
                <Menu />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerTitle>Menu Kurio</DrawerTitle>
              <DrawerDescription>Navegue pela Kurio.</DrawerDescription>
              <nav
                aria-label="Navegação mobile"
                className="my-6 flex flex-col gap-5"
              >
                {navigation}
              </nav>
              <DrawerClose asChild>
                <Button variant="outline">Fechar menu</Button>
              </DrawerClose>
            </DrawerContent>
          </Drawer>
        </div>
      </header>
      <main
        id="conteudo"
        className="mx-auto w-full max-w-7xl min-w-0 px-5 py-6 md:px-8 md:py-8"
      >
        <Outlet />
      </main>
      {!authPage && (
        <footer className="mx-auto mt-16 w-full max-w-7xl px-5 pb-6 md:mt-24 md:px-8">
          <div className="grid gap-8 bg-card p-6 md:grid-cols-2 lg:grid-cols-4 md:p-8">
            {[
              [
                'W',
                'Segurança da carteira',
                'Proteja sua carteira e colecione arte digital verificada com confiança.',
              ],
              [
                'C',
                'Criadores em destaque',
                'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
              ],
              [
                'D',
                'Alertas de lançamentos',
                'Receba calendários de cunhagem, novidades e análises do mercado.',
              ],
            ].map(([letter, title, description]) => (
              <div key={letter}>
                <span
                  aria-hidden="true"
                  className="mb-4 grid size-12 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
                >
                  {letter}
                </span>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
            <div className="border-t pt-5 md:border-t-0 md:border-l md:pl-5">
              <h3 className="mb-3 text-sm font-semibold">
                Antecipe-se ao próximo lançamento
              </h3>
              <label className="text-xs text-muted-foreground">
                E-mail para novidades
                <input
                  type="email"
                  placeholder="digite seu e-mail..."
                  disabled
                  className="mt-2 h-10 w-full rounded bg-secondary px-3"
                />
              </label>
              <Button disabled className="mt-3" size="sm">
                Enviar
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Inscrições em breve.
              </p>
            </div>
          </div>
          <div className="grid gap-4 bg-secondary p-6 text-xs md:grid-cols-4">
            <strong>KURIO</strong>
            <p>Feito para colecionadores, criadores e cultura</p>
            <a href="mailto:contato@email.com">contato@email.com</a>
            <a href="tel:+551140028922">+55 11 4002 8922</a>
          </div>
          <div className="grid grid-cols-2 gap-8 bg-card p-6 text-xs md:grid-cols-4">
            <div>
              <h3 className="mb-3 font-bold">Meu perfil</h3>
              <Link to="/profile">Meu perfil</Link>
              <p className="mt-3">
                <Link to="/wallets">Minhas carteiras</Link>
              </p>
              <p className="mt-3">
                <Link to="/cart">Carrinho</Link>
              </p>
            </div>
            <div>
              <h3 className="mb-3 font-bold">Central de ajuda</h3>
              <p className="leading-7 text-muted-foreground">
                Como comprar NFTs
                <br />
                Carteira e segurança
                <br />
                Política do mercado
              </p>
            </div>
            <div>
              <h3 className="mb-3 font-bold">Coleções</h3>
              <p className="leading-7 text-muted-foreground">
                Arte digital
                <br />
                Fotografia
                <br />
                Música
                <br />
                Arte 3D
                <br />
                Utilidade
              </p>
            </div>
            <div>
              <h3 className="mb-3 font-bold">Redes sociais</h3>
              <div className="flex flex-wrap gap-3" aria-label="Redes sociais">
                {[
                  'facebook',
                  'instagram',
                  'twitter',
                  'linkedin',
                  'youtube',
                ].map((name) => (
                  <img
                    key={name}
                    src={`/assets/icons/redes-sociais/${name}.svg`}
                    alt={name}
                    className="size-5"
                  />
                ))}
              </div>
              <h3 className="mt-6 mb-2 font-bold">Carteiras compatíveis</h3>
              <p className="text-[10px] text-primary">
                METAMASK · WALLETCONNECT · COINBASE
              </p>
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] text-text-secondary">
            © 2026 Kurio. Propriedade digital para todos.
          </p>
        </footer>
      )}
    </>
  )
}
