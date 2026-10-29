import type { Edition } from '@/domain/nft'
import type { MockDb } from './db'
import { commit, now } from './db'
import { publish } from './realtime'
import { toWei } from '@/lib/eth'

export function updateEdition(
  db: MockDb,
  nftId: string,
  editionId: string,
  patch: Partial<Pick<Edition, 'priceEth' | 'availableQuantity'>>,
) {
  const nft = db.nfts.find((n) => n.id === nftId)!
  const edition = nft.editions.find((e) => e.id === editionId)!
  Object.assign(edition, patch)
  edition.version++
  nft.version++
  nft.soldOut = nft.editions.every((e) => !e.availableQuantity)
  nft.priceEth =
    [...nft.editions]
      .filter((e) => e.availableQuantity)
      .sort((a, b) => (toWei(a.priceEth) < toWei(b.priceEth) ? -1 : 1))[0]
      ?.priceEth ?? edition.priceEth
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
  publish(await commit((db) => updateEdition(db, nftId, editionId, patch)))
}
