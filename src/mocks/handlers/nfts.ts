import {
  catalogQuerySchema,
  nftDetailSchema,
  nftSummarySchema,
} from '@/domain/nft'
import { toWei } from '@/lib/eth'
import { getDb } from '../db'
import { Failure, json, parse, route } from './util'

export const nftHandlers = [
  route('get', '/nfts', async ({ request }) => {
    const params = new URL(request.url).searchParams
    const raw: Record<string, unknown> = Object.fromEntries(params)
    for (const key of ['collections', 'networks'])
      if (params.has(key)) raw[key] = params.getAll(key)
    for (const key of ['page', 'pageSize'])
      if (params.has(key)) raw[key] = Number(params.get(key))
    const q = parse(catalogQuerySchema, raw)
    const items = (await getDb()).nfts.filter(
      (n) =>
        (!q.search || n.name.toLowerCase().includes(q.search.toLowerCase())) &&
        (!q.collections?.length || q.collections.includes(n.collection)) &&
        (!q.networks?.length || q.networks.includes(n.network)) &&
        (!q.minPriceEth || toWei(n.priceEth) >= toWei(q.minPriceEth)) &&
        (!q.maxPriceEth || toWei(n.priceEth) <= toWei(q.maxPriceEth)),
    )
    items.sort((a, b) => {
      if (q.sort !== 'recent') {
        const diff = toWei(a.priceEth) - toWei(b.priceEth)
        if (diff)
          return (diff < 0n ? -1 : 1) * (q.sort === 'price-desc' ? -1 : 1)
      }
      if (q.tab === 'trending')
        return b.rating.count - a.rating.count || a.id.localeCompare(b.id)
      return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
    })
    const facets = (key: 'collection' | 'network') =>
      [...new Set(items.map((n) => n[key]))].sort().map((value) => ({
        value,
        count: items.filter((n) => n[key] === value).length,
      }))
    return json({
      items: items
        .slice((q.page - 1) * q.pageSize, q.page * q.pageSize)
        .map((n) => nftSummarySchema.parse(n)),
      page: q.page,
      pageSize: q.pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / q.pageSize),
      facets: {
        collections: facets('collection'),
        networks: facets('network'),
      },
    })
  }),
  route('get', '/nfts/:id', async ({ params }) => {
    const nft = (await getDb()).nfts.find((n) => n.id === params.id)
    if (!nft) throw new Failure(404, 'NOT_FOUND')
    return json(nftDetailSchema.parse(nft))
  }),
]
