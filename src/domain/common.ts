import { z } from 'zod'
import { ETH_DECIMAL_REGEX } from '@/lib/eth'

// ETH trafega como string decimal (até 18 casas) para não perder precisão em float.
export const ethAmountSchema = z
  .string()
  .regex(ETH_DECIMAL_REGEX, 'Valor em ETH inválido')

export const isoDateSchema = z.iso.datetime()

// Versão crescente por recurso: o cliente descarta dados mais velhos que o cache.
export const versionSchema = z.number().int().nonnegative()

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])

export const walletProviderSchema = z.enum([
  'metamask',
  'walletconnect',
  'coinbase',
])

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export type EthAmount = z.infer<typeof ethAmountSchema>
export type Network = z.infer<typeof networkSchema>
export type WalletProvider = z.infer<typeof walletProviderSchema>
