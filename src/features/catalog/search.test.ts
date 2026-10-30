import { describe, expect, it } from 'vitest'
import type { CatalogSearch } from './search'
import { catalogSearchSchema, toCatalogQuery, withFilter } from './search'

describe('search do catálogo', () => {
  it('aceita ?collections=music e uma rede única', () => {
    const params = Object.fromEntries(
      new URLSearchParams('?collections=music&networks=polygon'),
    )
    expect(catalogSearchSchema.parse(params)).toMatchObject({
      collections: ['music'],
      networks: ['polygon'],
    })
  })

  it('aplica os padrões', () => {
    expect(catalogSearchSchema.parse({})).toEqual({
      q: '',
      collections: [],
      networks: [],
      min: undefined,
      max: undefined,
      tab: 'all',
      sort: 'recent',
      page: 1,
    })
  })

  it('recupera campos inválidos sem descartar os válidos', () => {
    expect(
      catalogSearchSchema.parse({
        q: 'a'.repeat(81),
        collections: ['inválida'],
        networks: ['bitcoin'],
        min: '-1',
        max: 2,
        tab: 'other',
        sort: 'other',
        page: '2.5',
      }),
    ).toEqual(catalogSearchSchema.parse({}))
    expect(
      catalogSearchSchema.parse({
        q: ' arte ',
        page: '3',
        min: '0.123456789123456789',
      }),
    ).toMatchObject({ q: 'arte', page: 3, min: '0.123456789123456789' })
  })

  it.each([0, -1, 1.5, null, true, '', 'abc', Infinity])(
    'normaliza página inválida %s',
    (page) => {
      expect(catalogSearchSchema.parse({ page }).page).toBe(1)
    },
  )

  it('mapeia q e preços para o contrato da API', () => {
    const query = toCatalogQuery(
      catalogSearchSchema.parse({
        q: ' arte ',
        collections: ['music'],
        networks: ['polygon'],
        min: '0.1',
        max: '2',
        tab: 'new',
        sort: 'price-asc',
        page: '4',
      }),
    )
    expect(query).toEqual({
      search: 'arte',
      collections: ['music'],
      networks: ['polygon'],
      minPriceEth: '0.1',
      maxPriceEth: '2',
      tab: 'new',
      sort: 'price-asc',
      page: 4,
      pageSize: 9,
    })
    expect(query).not.toHaveProperty('q')
  })

  it.each([
    { q: 'novo' },
    { collections: ['music'] },
    { networks: ['polygon'] },
    { min: '1' },
    { max: '2' },
    { tab: 'new' },
    { sort: 'price-desc' },
  ] satisfies Partial<Omit<CatalogSearch, 'page'>>[])(
    'reinicia página ao mudar filtro %j',
    (filter) => {
      const search = catalogSearchSchema.parse({ page: 5, q: 'arte' })
      expect(withFilter(search, { ...filter })).toMatchObject({
        ...filter,
        page: 1,
      })
      expect(search.page).toBe(5)
    },
  )
})
