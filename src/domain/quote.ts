import { z } from 'zod'
import {
  ethAmountSchema,
  isoDateSchema,
  networkSchema,
  versionSchema,
} from './common'

export const quoteLineSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  unitPriceEth: ethAmountSchema,
  quantity: z.number().int().positive(),
  lineTotalEth: ethAmountSchema,
  editionVersion: versionSchema,
})

// Snapshot calculado pela API: a UI só exibe, nunca recalcula o total.
export const quoteSchema = z.object({
  id: z.string().min(1),
  cartRevision: versionSchema,
  network: networkSchema,
  lines: z.array(quoteLineSchema),
  coupon: z
    .object({ code: z.string(), percentOff: z.number().int() })
    .optional(),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  expiresAt: isoDateSchema,
})

export const quoteInputSchema = z.object({
  network: networkSchema.default('ethereum'),
  couponCode: z.string().trim().toUpperCase().optional(),
})

export type QuoteLine = z.infer<typeof quoteLineSchema>
export type Quote = z.infer<typeof quoteSchema>
export type QuoteInput = z.input<typeof quoteInputSchema>
