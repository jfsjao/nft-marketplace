import type { Edition } from '@/domain/nft'
import type { CartAdjustment } from '@/domain/cart'
import type { MockDb } from './db'
import { commit, now } from './db'
import { publish } from './realtime'
import { toWei } from '@/lib/eth'

export function updateEdition(
  db: MockDb,
  nftId: string,
  editionId: string,
  patch: Partial<Pick<Edition, 'priceEth' | 'availableQuantity'>>,
  adjustCarts = false,
) {
  const nft = db.nfts.find((n) => n.id === nftId)!
  const edition = nft.editions.find((e) => e.id === editionId)!
  const previousPrice = edition.priceEth
  Object.assign(edition, patch)
  edition.version++
  nft.version++
  nft.soldOut = nft.editions.every((e) => !e.availableQuantity)
  nft.priceEth =
    [...nft.editions]
      .filter((e) => e.availableQuantity)
      .sort((a, b) => (toWei(a.priceEth) < toWei(b.priceEth) ? -1 : 1))[0]
      ?.priceEth ?? edition.priceEth
  if (adjustCarts) {
    for (const cart of Object.values(db.carts)) {
      const item = cart.items.find(
        (entry) => entry.nftId === nftId && entry.editionId === editionId,
      )
      if (!item) continue
      const adjustments: CartAdjustment[] = []
      if (item.quantity > edition.availableQuantity) {
        item.quantity = edition.availableQuantity
        adjustments.push({
          nftId,
          editionId,
          reason: item.quantity ? 'quantity-reduced' : 'removed-sold-out',
          message: item.quantity
            ? 'Quantidade limitada ao estoque disponível.'
            : 'Item removido porque está esgotado.',
        })
        if (!item.quantity)
          cart.items = cart.items.filter((entry) => entry !== item)
      }
      if (item.quantity && previousPrice !== edition.priceEth)
        adjustments.push({
          nftId,
          editionId,
          reason: 'price-changed',
          message: 'O preço do item foi atualizado.',
        })
      if (adjustments.length) {
        cart.adjustments ??= []
        cart.adjustments.push(...adjustments)
        cart.revision++
      }
    }
  }
  return {
    type: 'nft.updated' as const,
    eventId: `event-${++db.counters.event}`,
    occurredAt: new Date(now()).toISOString(),
    version: edition.version,
    resource: { nftId, editionId },
    data: {
      priceEth: edition.priceEth,
      availableQuantity: edition.availableQuantity,
    },
  }
}
export async function changeEdition(
  nftId: string,
  editionId: string,
  patch: Partial<Pick<Edition, 'priceEth' | 'availableQuantity'>>,
) {
  publish(
    await commit((db) => updateEdition(db, nftId, editionId, patch, true)),
  )
}
