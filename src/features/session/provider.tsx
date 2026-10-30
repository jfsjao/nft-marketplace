import { useEffect, type ReactNode } from 'react'
import { createRealtime } from '@/lib/socket'
import { sessionStore } from './store'
import { useSession } from './use-session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const { status, session, generation } = useSession()
  useEffect(() => {
    if (status === 'unknown') return
    const realtime = createRealtime(session?.token, session?.user.id)
    sessionStore.setRealtime(realtime.disconnect)
    return realtime.disconnect
  }, [status, session?.token, session?.user.id, generation])
  return children
}
