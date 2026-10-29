import { api } from './client'
import {
  cartSchema,
  updateCartItemInputSchema,
  type CartItem,
} from '@/domain/cart'

export async function getCart(signal?: AbortSignal) {
  return cartSchema.parse((await api.get('/cart', { signal })).data)
}

function itemPath(item: Pick<CartItem, 'nftId' | 'editionId'>) {
  return `/cart/items/${encodeURIComponent(item.nftId)}/${encodeURIComponent(item.editionId)}`
}

export async function updateCartItem(
  item: CartItem,
  quantity: number,
  signal?: AbortSignal,
) {
  const input = updateCartItemInputSchema.parse({ quantity })
  return cartSchema.parse(
    (await api.patch(itemPath(item), input, { signal })).data,
  )
}

export async function removeCartItem(item: CartItem, signal?: AbortSignal) {
  return cartSchema.parse((await api.delete(itemPath(item), { signal })).data)
}
