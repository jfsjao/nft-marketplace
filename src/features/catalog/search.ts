import { z } from 'zod'
import { ethAmountSchema, networkSchema } from '@/domain/common'
import {
  catalogQuerySchema,
  catalogSortSchema,
  catalogTabSchema,
  collectionSchema,
} from '@/domain/nft'

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).catch(''),
  collections: z.array(collectionSchema).catch([]),
  networks: z.array(networkSchema).catch([]),
  min: ethAmountSchema.optional().catch(undefined),
  max: ethAmountSchema.optional().catch(undefined),
  tab: catalogTabSchema.catch('all'),
  sort: catalogSortSchema.catch('recent'),
  page: z.preprocess(
    (value) =>
      typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
    z.number().int().positive().catch(1),
  ),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function toCatalogQuery(search: CatalogSearch) {
  return catalogQuerySchema.parse({
    search: search.q,
    collections: search.collections,
    networks: search.networks,
    minPriceEth: search.min,
    maxPriceEth: search.max,
    tab: search.tab,
    sort: search.sort,
    page: search.page,
  })
}

export function withFilter(
  search: CatalogSearch,
  filters: Partial<Omit<CatalogSearch, 'page'>>,
): CatalogSearch {
  return catalogSearchSchema.parse({ ...search, ...filters, page: 1 })
}
