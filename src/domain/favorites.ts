import { z } from 'zod'

// Favoritos são privados: nunca vêm dentro do NFT público.
export const favoritesSchema = z.object({
  nftIds: z.array(z.string()),
})

export type Favorites = z.infer<typeof favoritesSchema>
