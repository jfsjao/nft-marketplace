import { io } from 'socket.io-client'
import { serverEventSchema, type ServerEvent } from '@/domain/events'

const observers = new Set<(event: ServerEvent) => void>()
const reconnectListeners = new Set<() => void>()
export function observeRealtime(
  listener: (event: ServerEvent) => void,
  reconnect?: () => void,
) {
  observers.add(listener)
  if (reconnect) reconnectListeners.add(reconnect)
  return () => {
    observers.delete(listener)
    if (reconnect) reconnectListeners.delete(reconnect)
  }
}

type EventType = ServerEvent['type']
type Listener = (event: ServerEvent) => void

// Conectar somente depois de await worker.start().
export function createRealtime(token?: string, userId?: string) {
  const socket = io(
    typeof location === 'undefined' ? 'http://localhost' : location.origin,
    { transports: ['websocket'], auth: { token }, forceNew: true },
  )
  socket.on('connect', () => {
    for (const listener of reconnectListeners) listener()
  })
  const seen = new Set<string>()
  const versions = new Map<string, number>()
  const listeners = new Map<EventType, Set<Listener>>()

  for (const type of ['nft.updated', 'order.updated'] as const) {
    socket.on(type, (payload: unknown) => {
      const parsed = serverEventSchema.safeParse(payload)
      if (!parsed.success || parsed.data.type !== type) return
      const event = parsed.data
      if (event.type === 'order.updated' && event.resource.userId !== userId)
        return
      const key = JSON.stringify(
        event.type === 'nft.updated'
          ? [event.type, event.resource.nftId, event.resource.editionId]
          : [event.type, event.resource.userId, event.resource.orderId],
      )
      if (seen.has(event.eventId) || event.version <= (versions.get(key) ?? -1))
        return
      seen.add(event.eventId)
      versions.set(key, event.version)
      for (const observer of observers) observer(event)
      for (const listener of listeners.get(type) ?? []) listener(event)
    })
  }

  return {
    on<T extends EventType>(
      type: T,
      cb: (event: Extract<ServerEvent, { type: T }>) => void,
    ) {
      const listener: Listener = (event) => {
        if (event.type === type) cb(event as Extract<ServerEvent, { type: T }>)
      }
      const callbacks = listeners.get(type) ?? new Set<Listener>()
      listeners.set(type, callbacks)
      callbacks.add(listener)
      return () => {
        callbacks.delete(listener)
      }
    },
    // Eventos perdidos exigem reconciliação REST após reconectar.
    reconnect() {
      socket.disconnect().connect()
    },
    disconnect() {
      socket.disconnect()
      listeners.clear()
    },
  }
}
