import { useQuery } from '@tanstack/react-query'
import { getSession } from './api/auth'
import { useCatalogRealtime } from './features/catalog/realtime'
import { Link, Outlet } from '@tanstack/react-router'
import { useSession } from './features/session/use-session'

export default function App() {
  useCatalogRealtime()
  const { session, status, logout } = useSession()
  const refreshed = useQuery({
    queryKey: ['auth-session', session?.user.id],
    queryFn: getSession,
    enabled: status === 'authenticated',
    retry: false,
  })
  return (
    <>
      <header>
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
          Kurio
        </Link>
        {status === 'authenticated' ? (
          <>
            <span>
              {refreshed.data?.user.displayName ?? session?.user.displayName}
            </span>
            <button onClick={() => void logout()}>Sair</button>
          </>
        ) : (
          <Link to="/login" search={{ redirect: undefined }}>
            Entrar
          </Link>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
