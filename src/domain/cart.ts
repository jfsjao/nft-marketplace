import { z } from 'zod'
import { ethAmountSchema, versionSchema } from './common'

export const cartItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  editionLabel: z.string(),
  unitPriceEth: ethAmountSchema,
  quantity: z.number().int().positive(),
  availableQuantity: z.number().int().nonnegative(),
  lineTotalEth: ethAmountSchema,
  // Versão da edição quando o item foi lido: muda com nft.updated.
  editionVersion: versionSchema,
})

// Ajuste que a API fez sozinha (estoque caiu, preço mudou, merge limitado).
export const cartAdjustmentSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  reason: z.enum(['price-changed', 'quantity-reduced', 'removed-sold-out']),
  message: z.string(),
})

// O dono é o usuário logado ou o visitante (guestId); a API é a autoridade.
export const cartSchema = z.object({
  ownerId: z.string().min(1),
  items: z.array(cartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotalEth: ethAmountSchema,
  // Sobe a cada mudança; a cotação guarda a revisão que ela calculou.
  revision: versionSchema,
  adjustments: z.array(cartAdjustmentSchema),
})

export const addCartItemInputSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: z.number().int().positive(),
})

export const updateCartItemInputSchema = z.object({
  quantity: z.number().int().positive(),
})

// Ao logar, os itens do visitante entram no carrinho da conta uma única vez.
export const mergeCartInputSchema = z.object({
  guestId: z.string().min(1),
})

export type CartItem = z.infer<typeof cartItemSchema>
export type CartAdjustment = z.infer<typeof cartAdjustmentSchema>
export type Cart = z.infer<typeof cartSchema>
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>
export type MergeCartInput = z.infer<typeof mergeCartInputSchema>
