import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { router } from './router'
import { SessionProvider } from './features/session/provider'
import { sessionStore } from './features/session/store'
import { SessionRouter } from './features/session/session-router'

const root = createRoot(document.getElementById('root')!)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: false } },
})

sessionStore.configure(queryClient, () => router.state.location.href)

async function start() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
    const { settle } = await import('./mocks/handlers/util')
    await settle()
  }

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SessionRouter />
        </SessionProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

start().catch(() => {
  root.render(
    <p role="alert">
      Não foi possível iniciar a aplicação. Recarregue a página para tentar
      novamente.
    </p>,
  )
})
