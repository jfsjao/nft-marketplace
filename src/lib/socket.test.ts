// @vitest-environment node
import { afterAll, expect, it, vi } from 'vitest'
import { setupServer } from 'msw/node'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/domain/events'
import { resetDb, now } from '@/mocks/db'
import * as realtime from '@/mocks/realtime'
import { socketHandler } from '@/mocks/socket'

// Em Node, o transporte padrão usa o pacote ws, fora da interceptação do MSW.
// O cliente real continua intacto, usando seu transporte WebSocket nativo.
vi.mock('socket.io-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('socket.io-client')>()
  const { WebSocket } = await import('engine.io-client')
  return {
    ...original,
    io: (url: string, options: Parameters<typeof original.io>[1]) =>
      original.io(url, { ...options, transports: [WebSocket] }),
  }
})

const server = setupServer(socketHandler)
server.listen({ onUnhandledRequest: 'error' })
const clients: { disconnect(): unknown }[] = []
afterAll(() => {
  for (const client of clients) client.disconnect()
  server.close()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('conecta, filtra por sessão e versão, reconecta e libera assinaturas', async () => {
  const unsubscribe = vi.fn()
  const originalSubscribe = realtime.subscribe
  const subscription = vi
    .spyOn(realtime, 'subscribe')
    .mockImplementation((cb) => {
      const remove = originalSubscribe(cb)
      return () => {
        remove()
        unsubscribe()
      }
    })
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const db = await resetDb()
  db.sessions.push(
    {
      token: 'owner',
      userId: db.users[0].id,
      expiresAt: new Date(now() + 60_000).toISOString(),
    },
    {
      token: 'other',
      userId: db.users[1].id,
      expiresAt: new Date(now() + 60_000).toISOString(),
    },
    {
      token: 'expired',
      userId: db.users[0].id,
      expiresAt: new Date(now() - 1).toISOString(),
    },
  )
  const { io } = await import('socket.io-client')
  const { createRealtime } = await import('./socket')
  const rawClients = ['owner', 'other', 'expired', 'invalid', undefined].map(
    (token) =>
      io('http://localhost', {
        transports: ['websocket'],
        auth: { token },
        forceNew: true,
        reconnection: false,
      }),
  )
  clients.push(...rawClients)
  await Promise.all(
    rawClients.map(
      (socket) =>
        new Promise<void>((resolve, reject) => {
          socket.once('connect', resolve)
          socket.once('connect_error', reject)
        }),
    ),
  )
  const ping = vi.fn()
  rawClients[0].io.engine.on('ping', ping)
  await vi.advanceTimersByTimeAsync(40_000)
  await vi.waitFor(() => expect(ping).toHaveBeenCalledTimes(2))
  expect(rawClients[0].connected).toBe(true)
  const orders = rawClients.map(() => vi.fn())
  rawClients.forEach((socket, index) =>
    socket.on('order.updated', orders[index]),
  )
  const received = vi.fn()
  const client = await createRealtime('owner', db.users[1].id)
  clients.push(client)
  const privateReceived = vi.fn()
  client.on('order.updated', privateReceived)
  const removeListener = client.on('nft.updated', received)
  await vi.waitFor(() => expect(subscription).toHaveBeenCalledTimes(6))
  const nft: NftUpdatedEvent = {
    type: 'nft.updated',
    eventId: 'n1',
    version: 2,
    occurredAt: new Date(now()).toISOString(),
    resource: { nftId: 'nft', editionId: 'edition' },
    data: { priceEth: '1', availableQuantity: 2 },
  }
  const order: OrderUpdatedEvent = {
    type: 'order.updated',
    eventId: 'o1',
    version: 1,
    occurredAt: nft.occurredAt,
    resource: { orderId: 'order', userId: db.users[0].id },
    data: { status: 'confirmed' },
  }
  const publicEvents = rawClients.map(() => vi.fn())
  rawClients.forEach((socket, index) =>
    socket.on('nft.updated', publicEvents[index]),
  )
  realtime.publish(nft)
  realtime.publish(order)
  await vi.waitFor(() => {
    expect(received).toHaveBeenCalledWith(nft)
    expect(orders[0]).toHaveBeenCalledWith(order)
    publicEvents.forEach((listener) =>
      expect(listener).toHaveBeenCalledWith(nft),
    )
  })
  expect(privateReceived).not.toHaveBeenCalled()
  orders.slice(1).forEach((listener) => expect(listener).not.toHaveBeenCalled())
  realtime.publish(nft)
  realtime.publish({ ...nft, eventId: 'old', version: 1 })
  realtime.publish({ ...nft, eventId: 'equal', version: 2 })
  realtime.publish({
    ...nft,
    eventId: 'invalid',
    data: { ...nft.data, priceEth: 'bad' },
  })
  realtime.publish({ ...nft, eventId: 'new', version: 3 })
  await vi.waitFor(() => expect(received).toHaveBeenCalledTimes(2))
  removeListener()
  realtime.publish({ ...nft, eventId: 'removed', version: 4 })
  client.reconnect()
  await vi.waitFor(() => {
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(subscription).toHaveBeenCalledTimes(7)
  })
  expect(received).toHaveBeenCalledTimes(2)
  client.disconnect()
  rawClients.forEach((socket) => socket.disconnect())
  await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(7))
  expect(vi.getTimerCount()).toBe(0)
})
