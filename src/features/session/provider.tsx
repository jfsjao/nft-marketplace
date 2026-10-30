import { useEffect, type ReactNode } from 'react'
import { createRealtime } from '@/lib/socket'
import { sessionStore } from './store'
import { useSession } from './use-session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const { status, session, generation } = useSession()
  useEffect(() => {
    if (status === 'unknown') return
    let active = true
    let disconnect = () => {}
    void createRealtime(session?.token, session?.user.id).then((realtime) => {
      if (!active) return realtime.disconnect()
      disconnect = realtime.disconnect
      sessionStore.setRealtime(disconnect)
    })
    return () => {
      active = false
      disconnect()
    }
  }, [status, session?.token, session?.user.id, generation])
  return children
}
