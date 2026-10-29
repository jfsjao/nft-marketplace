import { HttpResponse } from 'msw'
import type { ServerEvent } from '@/domain/events'
import { createOrderInputSchema, orderSchema } from '@/domain/order'
import { quoteSchema } from '@/domain/quote'
import { cartView, commit, getDb, now } from '../db'
import { updateEdition } from '../actions'
import { publish } from '../realtime'
import { getScenario } from '../scenario'
import { editionFor } from './cart'
import { makeQuote } from './quote'
import { Failure, json, route, userId } from './util'

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
export const orderHandlers = [
  route('post', '/orders', async ({ request }) => {
    const db = await getDb()
    const id = userId(request, db)
    const key = request.headers.get('Idempotency-Key')?.trim()
    if (!key)
      throw new Failure(400, 'VALIDATION_ERROR', 'Informe Idempotency-Key', {
        'Idempotency-Key': ['Obrigatório'],
      })
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      throw new Failure(400, 'VALIDATION_ERROR', 'JSON inválido', {
        body: ['JSON inválido'],
      })
    }
    const payloadHash = canonical(raw)
    // Replays são resolvidos antes de validar o corpo ou a cotação.
    const result = await commit((db) => {
      const replay = db.idempotency.find(
        (i) => i.userId === id && i.key === key,
      )
      if (replay) {
        if (replay.payloadHash !== payloadHash)
          throw new Failure(409, 'IDEMPOTENCY_CONFLICT')
        return {
          order: db.orders.find((o) => o.id === replay.orderId)!,
          replay: true,
          events: [],
        }
      }
      const parsed = createOrderInputSchema.safeParse(raw)
      if (!parsed.success) return { validation: parsed.error }
      const input = parsed.data
      const quote = db.quotes.find((q) => q.id === input.quoteId)
      if (!quote) throw new Failure(404, 'NOT_FOUND')
      if (quote.userId !== id) throw new Failure(403, 'FORBIDDEN')
      const wallet = db.wallets.find((w) => w.id === input.walletId)
      if (!wallet) throw new Failure(404, 'NOT_FOUND')
      if (wallet.userId !== id) throw new Failure(403, 'FORBIDDEN')
      if (
        wallet.network !== input.network ||
        wallet.provider !== input.provider ||
        quote.network !== input.network
      )
        throw new Failure(
          422,
          'VALIDATION_ERROR',
          'Carteira e rede incompatíveis',
          { walletId: ['Confira a rede e o provedor'] },
        )
      const cart = cartView(id, db)
      const coupon =
        quote.coupon && db.coupons.find((c) => c.code === quote.coupon!.code)
      const stale =
        Date.parse(quote.expiresAt) <= now() ||
        cart.revision !== quote.cartRevision ||
        quote.networkFeeEth !== db.networkFees[quote.network] ||
        (quote.coupon &&
          (!coupon ||
            coupon.percentOff !== quote.coupon.percentOff ||
            Date.parse(coupon.expiresAt) <= now())) ||
        quote.lines.some((l) => {
          const e = editionFor(db, l.nftId, l.editionId)
          return (
            e.version !== l.editionVersion ||
            e.priceEth !== l.unitPriceEth ||
            e.availableQuantity < l.quantity
          )
        })
      if (stale) {
        const fresh = makeQuote(
          db,
          id,
          {
            network: quote.network,
            couponCode:
              coupon && Date.parse(coupon.expiresAt) > now()
                ? coupon.code
                : undefined,
          },
          true,
        )
        return { stale: quoteSchema.parse(fresh) }
      }
      if (!quote.lines.length)
        throw new Failure(422, 'VALIDATION_ERROR', 'Carrinho vazio', {
          cart: ['Adicione um item'],
        })
      const order = {
        id: `order-${++db.counters.id}`,
        userId: id,
        status: 'pending' as const,
        version: 1,
        lines: structuredClone(quote.lines),
        subtotalEth: quote.subtotalEth,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        network: input.network,
        provider: input.provider,
        walletAddress: wallet.address,
        createdAt: new Date(now()).toISOString(),
        settleAt: new Date(now() + 1500).toISOString(),
      }
      const events: ServerEvent[] = order.lines.map((l) =>
        updateEdition(db, l.nftId, l.editionId, {
          availableQuantity:
            editionFor(db, l.nftId, l.editionId).availableQuantity - l.quantity,
        }),
      )
      events.push({
        type: 'order.updated',
        eventId: `event-${++db.counters.event}`,
        occurredAt: order.createdAt,
        version: order.version,
        resource: { orderId: order.id, userId: id },
        data: { status: order.status },
      })
      db.orders.push(order)
      db.idempotency.push({ userId: id, key, payloadHash, orderId: order.id })
      return { order, replay: false, events }
    })
    if ('validation' in result && result.validation) {
      const fields: Record<string, string[]> = {}
      for (const issue of result.validation.issues)
        (fields[issue.path.join('.') || 'body'] ??= []).push(issue.message)
      throw new Failure(422, 'VALIDATION_ERROR', 'Revise os campos', fields)
    }
    if ('stale' in result && result.stale)
      throw new Failure(
        409,
        'QUOTE_STALE',
        'Aceite a nova cotação',
        undefined,
        result.stale,
      )
    if (!('order' in result) || !result.order) throw new Error('Pedido ausente')
    result.events!.forEach(publish)
    if (!result.replay && getScenario().orderOutcome === 'timeout')
      return HttpResponse.error()
    return json(orderSchema.parse(result.order), {
      status: result.replay ? 200 : 201,
    })
  }),
  route('get', '/orders/:id', async ({ request, params }) => {
    const db = await getDb()
    const id = userId(request, db)
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) throw new Failure(404, 'NOT_FOUND')
    if (order.userId !== id) throw new Failure(403, 'FORBIDDEN')
    return json(orderSchema.parse(order))
  }),
]
