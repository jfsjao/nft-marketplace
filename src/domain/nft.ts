import { z } from 'zod'
import {
  ethAmountSchema,
  networkSchema,
  paginationSchema,
  versionSchema,
} from './common'

// Coleções, rede e abas vêm da barra lateral e das abas da tela Início.
export const collectionSchema = z.enum([
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
])

export const catalogTabSchema = z.enum(['all', 'new', 'trending'])

export const catalogSortSchema = z.enum(['recent', 'price-asc', 'price-desc'])

// Edições da tela de detalhe: 1/1, 1/10, 1/50 e ABERTA (sem limite de série).
export const editionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  priceEth: ethAmountSchema,
  availableQuantity: z.number().int().nonnegative(),
  version: versionSchema,
})

export const nftSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tokenId: z.string().min(1),
  imageUrl: z.string().min(1),
  collection: collectionSchema,
  network: networkSchema,
  // Preço da edição mais barata disponível; o card mostra o riscado se houver.
  priceEth: ethAmountSchema,
  compareAtPriceEth: ethAmountSchema.optional(),
  isRare: z.boolean(),
  soldOut: z.boolean(),
  version: versionSchema,
})

export const nftDetailSchema = nftSummarySchema.extend({
  collectionName: z.string(),
  description: z.string(),
  longDescription: z.string(),
  gallery: z.array(z.string().min(1)).min(1),
  attributes: z.array(z.string()),
  editions: z.array(editionSchema).min(1),
  contractAddress: z.string(),
  tokenStandard: z.enum(['ERC-721', 'ERC-1155']),
  royaltyPercent: z.number().nonnegative(),
  rating: z.object({
    average: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
})

// Parâmetros enviados à API. Na URL a busca se chama `q` e é mapeada para `search`.
export const catalogQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  collections: z.array(collectionSchema).optional(),
  networks: z.array(networkSchema).optional(),
  minPriceEth: ethAmountSchema.optional(),
  maxPriceEth: ethAmountSchema.optional(),
  tab: catalogTabSchema.default('all'),
  sort: catalogSortSchema.default('recent'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(48).default(9),
})

const facetSchema = z.object({ value: z.string(), count: z.number().int() })

export const nftListSchema = paginationSchema.extend({
  items: z.array(nftSummarySchema),
  // Contagens da barra lateral, ex.: "Arte digital (33)".
  facets: z.object({
    collections: z.array(facetSchema),
    networks: z.array(facetSchema),
  }),
})

export type Collection = z.infer<typeof collectionSchema>
export type CatalogTab = z.infer<typeof catalogTabSchema>
export type CatalogSort = z.infer<typeof catalogSortSchema>
export type Edition = z.infer<typeof editionSchema>
export type NftSummary = z.infer<typeof nftSummarySchema>
export type NftDetail = z.infer<typeof nftDetailSchema>
export type CatalogQuery = z.input<typeof catalogQuerySchema>
export type NftList = z.infer<typeof nftListSchema>
