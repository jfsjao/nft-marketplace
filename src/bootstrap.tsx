import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { SessionProvider } from './features/session/provider'
import { sessionStore } from './features/session/store'
import { SessionRouter } from './features/session/session-router'

const root = createRoot(document.getElementById('root')!)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: false } },
})

sessionStore.configure(queryClient, () => router.state.location.href)

export function mount() {
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
