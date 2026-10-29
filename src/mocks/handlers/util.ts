import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { ApiErrorCode } from '@/domain/errors'
import type { Quote } from '@/domain/quote'
import { commit, getDb, now, type MockDb } from '../db'
import { getScenario, setScenario } from '../scenario'
import { publish } from '../realtime'
import { updateEdition } from '../actions'

export class Failure extends Error {
  status: number
  code: ApiErrorCode
  fieldErrors?: Record<string, string[]>
  quote?: Quote
  constructor(
    status: number,
    code: ApiErrorCode,
    message = code as string,
    fieldErrors?: Record<string, string[]>,
    quote?: Quote,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.quote = quote
  }
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields: Record<string, string[]> = {}
    for (const issue of result.error.issues)
      (fields[issue.path.join('.') || 'body'] ??= []).push(issue.message)
    throw new Failure(422, 'VALIDATION_ERROR', 'Revise os campos', fields)
  }
  return result.data
}
export async function body<T>(request: Request, schema: z.ZodType<T>) {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    throw new Failure(400, 'VALIDATION_ERROR', 'JSON inválido', {
      body: ['JSON inválido'],
    })
  }
  return parse(schema, value)
}
export function userId(request: Request, db: MockDb) {
  const token = request.headers
    .get('Authorization')
    ?.match(/^Bearer (.+)$/)?.[1]
  const session = db.sessions.find(
    (s) => s.token === token && Date.parse(s.expiresAt) > now(),
  )
  if (!session) throw new Failure(401, 'UNAUTHORIZED')
  return session.userId
}
export function owner(request: Request, db: MockDb) {
  if (request.headers.has('Authorization')) return userId(request, db)
  const guest = request.headers.get('X-Guest-Id')?.trim()
  if (!guest) throw new Failure(401, 'UNAUTHORIZED')
  return `guest:${guest}`
}
export async function settle() {
  const db = await getDb()
  if (
    !db.orders.some(
      (o) => o.status === 'pending' && Date.parse(o.settleAt!) <= now(),
    )
  )
    return
  const events = await commit((db) => {
    const events = []
    for (const order of db.orders) {
      if (order.status !== 'pending' || Date.parse(order.settleAt!) > now())
        continue
      order.status =
        getScenario().orderOutcome === 'declined' ? 'declined' : 'confirmed'
      order.version++
      order.settledAt = new Date(now()).toISOString()
      if (order.status === 'declined') {
        order.declineReason = 'PAYMENT_DECLINED'
        for (const line of order.lines) {
          const edition = db.nfts
            .find((n) => n.id === line.nftId)!
            .editions.find((e) => e.id === line.editionId)!
          events.push(
            updateEdition(db, line.nftId, line.editionId, {
              availableQuantity: edition.availableQuantity + line.quantity,
            }),
          )
        }
      } else {
        order.transactionHash = `0x${order.id.replace(/\D/g, '').padStart(64, '0')}`
        order.explorerUrl = `https://example.com/${order.network}/tx/${order.transactionHash}`
        const cart = db.carts[order.userId]
        if (cart) {
          for (const line of order.lines) {
            const item = cart.items.find(
              (i) => i.nftId === line.nftId && i.editionId === line.editionId,
            )
            if (item) item.quantity = Math.max(0, item.quantity - line.quantity)
          }
          cart.items = cart.items.filter((i) => i.quantity > 0)
          cart.revision++
        }
      }
      events.push({
        type: 'order.updated' as const,
        eventId: `event-${++db.counters.event}`,
        occurredAt: order.settledAt,
        version: order.version,
        resource: { orderId: order.id, userId: order.userId },
        data: { status: order.status },
      })
    }
    return events
  })
  events.forEach(publish)
}
type Context = {
  request: Request
  params: Record<string, string | readonly string[] | undefined>
}
export function route(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  handle: (context: Context) => Promise<Response>,
) {
  return http[method](`*/api${path}`, async (context) => {
    try {
      await settle()
      const scenario = getScenario()
      await delay(
        { none: 0, fast: 80, slow: 1500, variable: 100 + Math.random() * 500 }[
          scenario.latency
        ],
      )
      const failure = scenario.failures.find(
        (f) =>
          (f.route === '*' ||
            f.route === path ||
            f.route === `${context.request.method} ${path}` ||
            f.route === `/api${path}`) &&
          f.times !== 0,
      )
      if (failure) {
        if (failure.times > 0) {
          failure.times--
          setScenario({ failures: scenario.failures })
        }
        if (!failure.status) return HttpResponse.error()
        throw new Failure(failure.status, failure.code)
      }
      return await handle(context)
    } catch (error) {
      if (!(error instanceof Failure)) throw error
      return HttpResponse.json(
        {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors,
          quote: error.quote,
          requestId: crypto.randomUUID(),
        },
        { status: error.status },
      )
    }
  })
}
export const json = HttpResponse.json
