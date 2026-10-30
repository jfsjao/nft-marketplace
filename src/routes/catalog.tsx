import { KurioHero } from '@/components/kurio-hero'
import { CatalogFilters } from '@/components/catalog-filters'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { listNfts } from '@/api/nfts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AsyncState } from '@/components/async-state'
import { NftCard } from '@/components/nft-card'
import {
  collectionSchema,
  catalogTabSchema,
  catalogSortSchema,
} from '@/domain/nft'
import { networkSchema } from '@/domain/common'
import {
  toCatalogQuery,
  withFilter,
  type CatalogSearch,
} from '@/features/catalog/search'
import { FavoriteButton } from '@/features/catalog/favorites'

export function Catalog() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const filter = (patch: Partial<CatalogSearch>) =>
    void navigate({ search: withFilter(search, patch) })
  const query = toCatalogQuery(search)
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['nfts', query],
    queryFn: ({ signal }) => listNfts(query, signal),
    placeholderData: keepPreviousData,
  })
  return (
    <section className="min-w-0">
      <h1 className="mb-4 text-xl font-bold md:sr-only">Catálogo</h1>
      <KurioHero />
      <div
        id="catalogo"
        className="mt-8 grid min-w-0 gap-6 md:mt-12 md:grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]"
      >
        <CatalogFilters>
          {(['collections', 'networks'] as const).map((kind) => (
            <fieldset key={kind} className="space-y-3 text-sm">
              <legend className="mb-4 font-semibold">
                {kind === 'collections' ? 'Coleções' : 'Redes'}
              </legend>
              {(kind === 'collections'
                ? collectionSchema.options
                : networkSchema.options
              ).map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <input
                    aria-label={
                      data
                        ? `${value} (${data.facets[kind].find((facet) => facet.value === value)?.count ?? 0})`
                        : value
                    }
                    className="accent-primary"
                    type="checkbox"
                    checked={(search[kind] as string[]).includes(value)}
                    onChange={(event) =>
                      filter({
                        [kind]: event.target.checked
                          ? [...search[kind], value]
                          : search[kind].filter((item) => item !== value),
                      })
                    }
                  />
                  {
                    {
                      'digital-art': 'Arte digital',
                      photography: 'Fotografia',
                      music: 'Música',
                      '3d-art': 'Arte 3D',
                      collectibles: 'Colecionáveis',
                      generative: 'Generativa',
                      gaming: 'Jogos',
                      subscriptions: 'Assinaturas',
                      utility: 'Utilidade',
                      ethereum: 'Ethereum',
                      polygon: 'Polygon',
                      solana: 'Solana',
                    }[value]
                  }{' '}
                  {data &&
                    `(${data.facets[kind].find((facet) => facet.value === value)?.count ?? 0})`}
                </label>
              ))}
            </fieldset>
          ))}
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold">Faixa de preço</h3>
            <label>
              Preço mínimo (ETH)
              <Input
                form="busca"
                name="min"
                defaultValue={search.min}
                key={`min-${search.min}`}
                pattern="[0-9]+(\.[0-9]{1,18})?"
              />
            </label>
            <label>
              Preço máximo (ETH)
              <Input
                form="busca"
                name="max"
                defaultValue={search.max}
                key={`max-${search.max}`}
                pattern="[0-9]+(\.[0-9]{1,18})?"
              />
            </label>
            <Button type="submit" form="busca">
              Aplicar
            </Button>
          </div>
        </CatalogFilters>
        <div className="min-w-0 space-y-5">
          <form
            id="busca"
            className="flex items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              const values = new FormData(event.currentTarget)
              filter({
                q: String(values.get('q')),
                min: String(values.get('min') ?? search.min ?? '') || undefined,
                max: String(values.get('max') ?? search.max ?? '') || undefined,
              })
            }}
          >
            <label className="min-w-0 flex-1 text-xs text-muted-foreground">
              Busca
              <Input
                className="mt-2 h-12 bg-card"
                placeholder="Explorar coleções"
                name="q"
                defaultValue={search.q}
                key={search.q}
                maxLength={80}
              />
            </label>
            <Button type="submit">Buscar</Button>
          </form>
          <nav
            aria-label="Abas do catálogo"
            className="flex flex-wrap gap-1 border-b"
          >
            {catalogTabSchema.options.map((tab) => (
              <Button
                variant="ghost"
                className="rounded-none border-b-2 border-transparent px-2 text-xs aria-pressed:border-primary aria-pressed:text-primary lg:px-4 lg:text-sm"
                key={tab}
                aria-pressed={search.tab === tab}
                onClick={() => filter({ tab })}
              >
                {{ all: 'Todos', new: 'Novos', trending: 'Em alta' }[tab]}
              </Button>
            ))}
          </nav>
          <label className="flex flex-wrap items-center justify-end gap-3 text-xs text-text-secondary">
            Ordenação
            <select
              value={search.sort}
              onChange={(event) =>
                filter({ sort: catalogSortSchema.parse(event.target.value) })
              }
            >
              <option value="recent">Recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </label>
          <AsyncState
            isPending={isPending}
            isError={isError}
            refetch={refetch}
            loading="Carregando catálogo"
            layout="catalog"
            error="Não foi possível carregar o catálogo."
          />
          {data && !isPending && !isError && (
            <div aria-busy={isFetching}>
              {data.items.length === 0 ? (
                <AsyncState empty emptyMessage="Nenhum NFT encontrado." />
              ) : (
                <ul className="grid grid-cols-2 items-start gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-12">
                  {data.items.map((nft) => (
                    <li key={nft.id}>
                      <NftCard
                        nft={nft}
                        actions={<FavoriteButton id={nft.id} />}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <nav
                aria-label="Paginação"
                className="mt-10 flex flex-wrap items-center justify-end gap-3 text-xs"
              >
                <Button
                  disabled={search.page <= 1 || isFetching}
                  onClick={() =>
                    void navigate({
                      search: { ...search, page: search.page - 1 },
                    })
                  }
                >
                  Anterior
                </Button>
                <span>
                  Página {data.page} de {data.totalPages} ({data.total} NFTs)
                </span>
                <Button
                  disabled={search.page >= data.totalPages || isFetching}
                  onClick={() =>
                    void navigate({
                      search: { ...search, page: search.page + 1 },
                    })
                  }
                >
                  Próxima
                </Button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
