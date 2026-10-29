import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { getDb, now } from './db'
import { subscribe } from './realtime'

// O MSW remove /socket.io/ antes de comparar o endpoint.
const socketLink = ws.link(/^wss?:\/\/[^/]+\/$/)

export const socketHandler = socketLink.addEventListener(
  'connection',
  (connection) => {
    const io = toSocketIo(connection)
    let token: unknown
    let closed = false
    const unsubscribe = subscribe((event) => {
      if (event.type === 'nft.updated') {
        io.client.emit(event.type, event)
        return
      }
      void getDb().then((db) => {
        const session = db.sessions.find(
          (session) =>
            session.token === token && Date.parse(session.expiresAt) > now(),
        )
        if (!closed && session?.userId === event.resource.userId)
          io.client.emit(event.type, event)
      })
    })

    // O binding ignora CONNECT; o auth está no pacote bruto do namespace padrão.
    io.rawClient.addEventListener('message', ({ data }) => {
      if (typeof data !== 'string' || !data.startsWith('40')) return
      try {
        const auth: unknown = JSON.parse(data.slice(2))
        token =
          auth && typeof auth === 'object' && 'token' in auth
            ? auth.token
            : undefined
      } catch {
        token = undefined
      }
    })

    // O binding anuncia pingInterval, mas não envia o ping do Engine.IO.
    const heartbeat = setInterval(() => io.rawClient.send('2'), 20_000)
    io.rawClient.addEventListener('close', () => {
      closed = true
      unsubscribe()
      clearInterval(heartbeat)
    })
  },
)
