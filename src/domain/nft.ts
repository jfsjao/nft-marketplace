import { z } from 'zod'

export const nftSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  imageUrl: z.string().startsWith('/assets/nfts/'),
  priceEth: z.string().regex(/^\d+(\.\d{1,18})?$/),
  availableQuantity: z.number().int().nonnegative(),
})

export const nftListSchema = z.object({
  items: z.array(nftSchema),
  total: z.number().int().nonnegative(),
})

export type Nft = z.infer<typeof nftSchema>
