import { z } from 'zod'
import {
  ethAmountSchema,
  isoDateSchema,
  networkSchema,
  versionSchema,
  walletProviderSchema,
} from './common'
import { quoteLineSchema } from './quote'

// pending -> confirmed | declined. Os dois últimos são terminais e nunca regridem.
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])

// Formulário da tela Pagamento; a carteira vem das cadastradas.
export const checkoutInputSchema = z.object({
  walletId: z.string().min(1, 'Selecione uma carteira'),
  network: networkSchema,
  provider: walletProviderSchema,
  collector: z.object({
    displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
    username: z.string().trim().min(1, 'Informe o nome de usuário'),
    profileName: z.string().trim().min(1, 'Informe o nome do perfil'),
    email: z.email('E-mail inválido'),
    referralCode: z.string().trim().min(1, 'Informe o código de indicação'),
    ensName: z.string().trim().min(1, 'Informe o nome ENS'),
  }),
  note: z.string().trim().max(500).optional(),
})

// O pedido aponta para a cotação aceita; a API revalida antes de criar.
// O header Idempotency-Key acompanha este corpo.
export const createOrderInputSchema = checkoutInputSchema.extend({
  quoteId: z.string().min(1),
})

// Recibo: snapshot imutável, mudanças no catálogo não alteram estes valores.
export const orderSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  status: orderStatusSchema,
  version: versionSchema,
  lines: z.array(quoteLineSchema).min(1),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  network: networkSchema,
  provider: walletProviderSchema,
  walletAddress: z.string(),
  transactionHash: z.string().optional(),
  explorerUrl: z.string().optional(),
  declineReason: z.string().optional(),
  createdAt: isoDateSchema,
  settledAt: isoDateSchema.optional(),
})

export type OrderStatus = z.infer<typeof orderStatusSchema>
export type CheckoutInput = z.infer<typeof checkoutInputSchema>
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>
export type Order = z.infer<typeof orderSchema>
