import { api } from './client'
import {
  catalogQuerySchema,
  nftListSchema,
  type CatalogQuery,
} from '@/domain/nft'

export async function listNfts(
  queryOrSignal?: CatalogQuery | AbortSignal,
  signal?: AbortSignal,
) {
  const isSignal = queryOrSignal instanceof AbortSignal
  const query = catalogQuerySchema.parse(isSignal ? {} : (queryOrSignal ?? {}))
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value))
      value.forEach((entry) => params.append(key, entry))
    else if (value !== undefined) params.set(key, String(value))
  }
  const { data } = await api.get('/nfts', {
    params,
    signal: isSignal ? queryOrSignal : signal,
  })
  return nftListSchema.parse(data)
}
