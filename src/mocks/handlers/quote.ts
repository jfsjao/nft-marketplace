import { quoteInputSchema, type QuoteInput } from '@/domain/quote'
import { addEth, applyPercentDiscount } from '@/lib/eth'
import { cartView, commit, getDb, now, type MockDb } from '../db'
import { getScenario, setScenario } from '../scenario'
import { changeEdition } from '../actions'
import { body, Failure, json, route, userId } from './util'

export function makeQuote(
  db: MockDb,
  id: string,
  input: QuoteInput,
  allowUnavailable = false,
) {
  let cart = cartView(id, db)
  if (
    allowUnavailable &&
    cart.items.some((i) => i.quantity > i.availableQuantity)
  ) {
    const stored = db.carts[id]
    const adjustments = cart.items.flatMap((item) => {
      if (item.quantity <= item.availableQuantity) return []
      return [
        {
          nftId: item.nftId,
          editionId: item.editionId,
          reason: item.availableQuantity
            ? ('quantity-reduced' as const)
            : ('removed-sold-out' as const),
          message: item.availableQuantity
            ? 'Quantidade limitada ao estoque disponível.'
            : 'Item removido porque está esgotado.',
        },
      ]
    })
    stored.items = stored.items.flatMap((item) => {
      const available = cart.items.find(
        (i) => i.nftId === item.nftId && i.editionId === item.editionId,
      )!.availableQuantity
      const quantity = Math.min(item.quantity, available)
      return quantity ? [{ ...item, quantity }] : []
    })
    stored.adjustments ??= []
    stored.adjustments.push(...adjustments)
    stored.revision++
    cart = cartView(id, db)
  }
  if (
    !allowUnavailable &&
    cart.items.some((i) => i.quantity > i.availableQuantity)
  )
    throw new Failure(409, 'OUT_OF_STOCK')
  const coupon = input.couponCode
    ? db.coupons.find((c) => c.code === input.couponCode)
    : undefined
  if (input.couponCode && !coupon) throw new Failure(422, 'COUPON_INVALID')
  if (coupon && Date.parse(coupon.expiresAt) <= now())
    throw new Failure(422, 'COUPON_EXPIRED')
  const discount = applyPercentDiscount(
    cart.subtotalEth,
    coupon?.percentOff ?? 0,
  )
  const network = input.network ?? 'ethereum'
  const quote = {
    id: `quote-${crypto.randomUUID()}`,
    userId: id,
    cartRevision: cart.revision,
    network,
    lines: cart.items.map(
      ({
        nftId,
        editionId,
        name,
        tokenId,
        imageUrl,
        unitPriceEth,
        quantity,
        lineTotalEth,
        editionVersion,
      }) => ({
        nftId,
        editionId,
        name,
        tokenId,
        imageUrl,
        unitPriceEth,
        quantity,
        lineTotalEth,
        editionVersion,
      }),
    ),
    ...(coupon
      ? { coupon: { code: coupon.code, percentOff: coupon.percentOff } }
      : {}),
    subtotalEth: cart.subtotalEth,
    discountEth: discount.discountEth,
    networkFeeEth: db.networkFees[network],
    totalEth: addEth(discount.totalEth, db.networkFees[network]),
    expiresAt: new Date(now() + 30_000).toISOString(),
  }
  db.quotes.push(quote)
  return quote
}
let eventScheduled = false

export const quoteHandlers = [
  route('post', '/quote', async ({ request }) => {
    const input = await body(request, quoteInputSchema)
    const result = await commit((db) => {
      const quote = makeQuote(db, userId(request, db), input)
      return { quote }
    })
    const event = getScenario().event
    if (event && result.quote.lines.length && !eventScheduled) {
      eventScheduled = true
      const first = result.quote.lines[0]
      setTimeout(() => {
        eventScheduled = false
        void (async () => {
          if (!(await getDb()).quotes.some((q) => q.id === result.quote.id))
            return
          setScenario({ event: undefined })
          await changeEdition(
            first.nftId,
            first.editionId,
            event === 'sold-out'
              ? { availableQuantity: 0 }
              : { priceEth: addEth(first.unitPriceEth, '0.1') },
          )
        })()
      }, 2000)
    }
    const { userId: _, ...quote } = result.quote
    return json(quote)
  }),
]
