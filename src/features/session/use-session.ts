import { useSyncExternalStore } from 'react'
import { sessionStore } from './store'

export function useSession() {
  return {
    ...useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot),
    login: sessionStore.login,
    register: sessionStore.register,
    logout: sessionStore.logout,
  }
}
