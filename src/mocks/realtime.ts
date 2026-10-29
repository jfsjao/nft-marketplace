import type { ServerEvent } from '@/domain/events'

// Ponte entre os handlers REST (publicam) e o handler Socket.IO (entrega).
// Só o mock usa: a UI nunca chama publish, ela recebe pelo socket.io-client.
type Listener = (event: ServerEvent) => void

const listeners = new Set<Listener>()

export function publish(event: ServerEvent) {
  for (const listener of listeners) listener(event)
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
