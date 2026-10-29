import { api } from './client'
import { nftListSchema } from '@/domain/nft'

export async function listNfts(signal?: AbortSignal) {
  const { data } = await api.get('/nfts', { signal })
  return nftListSchema.parse(data)
}
