import { delay, http, HttpResponse } from 'msw'
import type { NftSummary } from '@/domain/nft'

// Seed provisória: o banco do mock (T3) substitui este array.
const nfts: NftSummary[] = [
  {
    id: 'emerald-ape-042',
    tokenId: '#0042',
    collection: 'digital-art',
    network: 'ethereum',
    isRare: false,
    soldOut: false,
    version: 1,
    name: 'Emerald Ape #042',
    imageUrl: '/assets/nfts/ape-esmeralda.png',
    priceEth: '1.19',
  },
  {
    id: 'sage-nomad-009',
    tokenId: '#0009',
    collection: 'digital-art',
    network: 'ethereum',
    isRare: false,
    soldOut: false,
    version: 1,
    name: 'Sage Nomad #009',
    imageUrl: '/assets/nfts/ape-moletom-roxo.png',
    priceEth: '1.69',
  },
  {
    id: 'ivory-baron-088',
    tokenId: '#0088',
    collection: 'digital-art',
    network: 'ethereum',
    isRare: false,
    soldOut: false,
    version: 1,
    name: 'Ivory Baron #088',
    imageUrl: '/assets/nfts/ape-blazer.png',
    priceEth: '1.79',
  },
  {
    id: 'golden-beat-207',
    tokenId: '#0207',
    collection: 'digital-art',
    network: 'ethereum',
    isRare: false,
    soldOut: false,
    version: 1,
    name: 'Golden Beat #207',
    imageUrl: '/assets/nfts/ape-fones-verdes.png',
    priceEth: '0.99',
  },
]

export const handlers = [
  http.get('*/api/nfts', async () => {
    await delay(250)
    return HttpResponse.json({
      items: nfts,
      page: 1,
      pageSize: 9,
      total: nfts.length,
      totalPages: 1,
      facets: { collections: [], networks: [] },
    })
  }),
]
