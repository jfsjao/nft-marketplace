import { z } from 'zod'
import { ethAmountSchema, isoDateSchema, versionSchema } from './common'
import { orderStatusSchema } from './order'

// Envelope comum: eventId detecta duplicata, version descarta evento antigo.
const envelope = {
  eventId: z.string().min(1),
  version: versionSchema,
  occurredAt: isoDateSchema,
}

export const nftUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('nft.updated'),
  resource: z.object({ nftId: z.string(), editionId: z.string() }),
  data: z.object({
    priceEth: ethAmountSchema,
    availableQuantity: z.number().int().nonnegative(),
  }),
})

// Só chega para o dono do pedido; o cliente ainda confere o userId da sessão.
export const orderUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('order.updated'),
  resource: z.object({ orderId: z.string(), userId: z.string() }),
  data: z.object({ status: orderStatusSchema }),
})

export const serverEventSchema = z.discriminatedUnion('type', [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
])

export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
export type ServerEvent = z.infer<typeof serverEventSchema>
