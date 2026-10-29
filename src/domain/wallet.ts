import { z } from 'zod'
import { networkSchema, versionSchema, walletProviderSchema } from './common'

// Endereço EVM (0x + 40 hex) ou Solana (base58); a validação por rede fica no refine.
const evmAddress = /^0x[a-fA-F0-9]{40}$/
const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

// Campos da tela Carteiras; cada usuário tem no máximo uma principal e uma secundária.
export const walletInputSchema = z
  .object({
    slot: z.enum(['primary', 'secondary']),
    displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
    nickname: z.string().trim().min(1, 'Informe o apelido da carteira'),
    network: networkSchema,
    provider: walletProviderSchema,
    address: z.string().trim(),
    ensOrSecondaryAddress: z.string().trim().optional(),
    profileName: z.string().trim().min(1, 'Informe o nome do perfil'),
    referralCode: z.string().trim().min(1, 'Informe o código de indicação'),
    email: z.email('E-mail inválido'),
    ensName: z.string().trim().min(1, 'Informe o nome ENS'),
  })
  .refine(
    (w) =>
      w.network === 'solana'
        ? solanaAddress.test(w.address)
        : evmAddress.test(w.address),
    { path: ['address'], message: 'Endereço incompatível com a rede' },
  )

export const walletSchema = walletInputSchema.safeExtend({
  id: z.string().min(1),
  version: versionSchema,
})

export type WalletInput = z.infer<typeof walletInputSchema>
export type Wallet = z.infer<typeof walletSchema>
