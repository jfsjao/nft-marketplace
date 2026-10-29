import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import { sessionStore } from './store'
import { useSession } from './use-session'

export function SessionRouter() {
  const queryClient = useQueryClient()
  const { session, status, generation } = useSession()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    void router.invalidate()
  }, [session, status, generation])
  useEffect(() => {
    void sessionStore.ready().catch(() => setFailed(true))
  }, [])
  if (status === 'unknown')
    return failed ? (
      <p role="alert">
        Não foi possível verificar a sessão.{' '}
        <button
          onClick={() => {
            setFailed(false)
            void sessionStore.ready().catch(() => setFailed(true))
          }}
        >
          Tentar novamente
        </button>
      </p>
    ) : (
      <p>Carregando sessão…</p>
    )
  return (
    <RouterProvider
      router={router}
      context={{
        queryClient,
        auth: { userId: session?.user.id ?? null, status },
      }}
    />
  )
}
