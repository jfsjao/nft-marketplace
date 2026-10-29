import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

const root = createRoot(document.getElementById('root')!)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: false } },
})

async function start() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider
          router={router}
          context={{ queryClient, auth: { userId: null, status: 'guest' } }}
        />
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
