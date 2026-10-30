import { api } from './client'
import { walletSchema } from '@/domain/wallet'

export async function getWallets(signal?: AbortSignal) {
  return walletSchema
    .array()
    .parse((await api.get('/wallets', { signal })).data)
}
