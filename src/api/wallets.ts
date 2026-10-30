import { api } from './client'
import {
  walletSchema,
  walletInputSchema,
  type WalletInput,
} from '@/domain/wallet'

export async function getWallets(signal?: AbortSignal) {
  return walletSchema
    .array()
    .parse((await api.get('/wallets', { signal })).data)
}

export async function connectWallet(id: string) {
  await api.post(`/wallets/${encodeURIComponent(id)}/connect`)
}

export async function saveWallet(input: WalletInput) {
  return walletSchema.parse(
    (await api.put(`/wallets/${input.slot}`, walletInputSchema.parse(input)))
      .data,
  )
}
