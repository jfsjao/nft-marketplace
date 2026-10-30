import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { router } from './router'
import { SessionProvider } from './features/session/provider'
import { sessionStore } from './features/session/store'
import { SessionRouter } from './features/session/session-router'
import { apiErrorSchema } from './domain/errors'

function retryTransientQuery(failureCount: number, error: unknown) {
  const apiError = apiErrorSchema.safeParse(error)
  return (
    failureCount < 2 &&
    ((apiError.success && apiError.data.code === 'SERVICE_UNAVAILABLE') ||
      (axios.isAxiosError(error) && !error.response))
  )
}

const root = createRoot(document.getElementById('root')!)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: retryTransientQuery },
    mutations: { retry: false },
  },
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
