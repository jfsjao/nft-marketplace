import {
  addCartItemInputSchema,
  updateCartItemInputSchema,
  mergeCartInputSchema,
  type CartAdjustment,
} from '@/domain/cart'
import { cartView, commit, type MockDb } from '../db'
import { body, Failure, json, owner, route, userId } from './util'

export function editionFor(db: MockDb, nftId: string, editionId: string) {
  const edition = db.nfts
    .find((n) => n.id === nftId)
    ?.editions.find((e) => e.id === editionId)
  if (!edition) throw new Failure(404, 'NOT_FOUND')
  return edition
}
export const cartHandlers = [
  route('get', '/cart', async ({ request }) =>
    json(
      await commit((db) => {
        const id = owner(request, db)
        const view = cartView(id, db)
        if (db.carts[id]) db.carts[id].adjustments = []
        return view
      }),
    ),
  ),
  route('post', '/cart/items', async ({ request }) => {
    const input = await body(request, addCartItemInputSchema)
    return json(
      await commit((db) => {
        const id = owner(request, db)
        const cart = (db.carts[id] ??= {
          items: [],
          revision: 0,
          adjustments: [],
        })
        const item = cart.items.find(
          (i) => i.nftId === input.nftId && i.editionId === input.editionId,
        )
        const quantity = (item?.quantity ?? 0) + input.quantity
        if (
          quantity >
          editionFor(db, input.nftId, input.editionId).availableQuantity
        )
          throw new Failure(409, 'OUT_OF_STOCK')
        if (item) item.quantity = quantity
        else cart.items.push(input)
        cart.revision++
        return cartView(id, db)
      }),
    )
  }),
  ...(['patch', 'delete'] as const).map((method) =>
    route(
      method,
      '/cart/items/:nftId/:editionId',
      async ({ request, params }) => {
        const input =
          method === 'patch'
            ? await body(request, updateCartItemInputSchema)
            : undefined
        return json(
          await commit((db) => {
            const id = owner(request, db)
            const cart = db.carts[id]
            const item = cart?.items.find(
              (i) =>
                i.nftId === params.nftId && i.editionId === params.editionId,
            )
            if (!item) throw new Failure(404, 'NOT_FOUND')
            if (input) {
              if (
                input.quantity >
                editionFor(db, item.nftId, item.editionId).availableQuantity
              )
                throw new Failure(409, 'OUT_OF_STOCK')
              item.quantity = input.quantity
            } else cart.items = cart.items.filter((i) => i !== item)
            cart.revision++
            return cartView(id, db)
          }),
        )
      },
    ),
  ),
  route('post', '/cart/merge', async ({ request }) => {
    const input = await body(request, mergeCartInputSchema)
    return json(
      await commit((db) => {
        const id = userId(request, db)
        const source = `guest:${input.guestId}`
        const cart = (db.carts[id] ??= {
          items: [],
          revision: 0,
          adjustments: [],
        })
        const adjustments: CartAdjustment[] = []
        if (db.carts[source]) {
          for (const item of db.carts[source].items) {
            const target = cart.items.find(
              (i) => i.nftId === item.nftId && i.editionId === item.editionId,
            )
            const desired = (target?.quantity ?? 0) + item.quantity
            const quantity = Math.min(
              desired,
              editionFor(db, item.nftId, item.editionId).availableQuantity,
            )
            if (quantity < desired)
              adjustments.push({
                nftId: item.nftId,
                editionId: item.editionId,
                reason: quantity ? 'quantity-reduced' : 'removed-sold-out',
                message: 'Quantidade limitada ao estoque',
              })
            if (target) target.quantity = quantity
            else if (quantity) cart.items.push({ ...item, quantity })
          }
          cart.items = cart.items.filter((i) => i.quantity > 0)
          cart.revision++
          cart.adjustments ??= []
          cart.adjustments.push(...adjustments)
          delete db.carts[source]
        }
        return cartView(id, db)
      }),
    )
  }),
]
