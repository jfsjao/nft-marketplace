import { useCatalogRealtime } from './features/catalog/realtime'
import { Link, Outlet } from '@tanstack/react-router'
import { useSession } from './features/session/use-session'

export default function App() {
  useCatalogRealtime()
  const { session, status, logout } = useSession()
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
            <span>{session?.user.displayName}</span>
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
