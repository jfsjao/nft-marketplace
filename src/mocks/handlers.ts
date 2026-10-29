import { delay, http, HttpResponse } from 'msw'
import type { Nft } from '@/domain/nft'

const nfts: Nft[] = [
  {
    id: 'emerald-ape-042',
    name: 'Emerald Ape #042',
    imageUrl: '/assets/nfts/ape-esmeralda.png',
    priceEth: '1.19',
    availableQuantity: 50,
  },
  {
    id: 'sage-nomad-009',
    name: 'Sage Nomad #009',
    imageUrl: '/assets/nfts/ape-moletom-roxo.png',
    priceEth: '1.69',
    availableQuantity: 10,
  },
  {
    id: 'ivory-baron-088',
    name: 'Ivory Baron #088',
    imageUrl: '/assets/nfts/ape-blazer.png',
    priceEth: '1.79',
    availableQuantity: 9,
  },
  {
    id: 'golden-beat-207',
    name: 'Golden Beat #207',
    imageUrl: '/assets/nfts/ape-fones-verdes.png',
    priceEth: '0.99',
    availableQuantity: 50,
  },
]

export const handlers = [
  http.get('*/api/nfts', async () => {
    await delay(250)
    return HttpResponse.json({ items: nfts, total: nfts.length })
  }),
]
