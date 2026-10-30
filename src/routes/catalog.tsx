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
    <section>
      <h1>Catálogo</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const values = new FormData(event.currentTarget)
          filter({
            q: String(values.get('q')),
            min: String(values.get('min')) || undefined,
            max: String(values.get('max')) || undefined,
          })
        }}
      >
        <label>
          Busca
          <Input
            name="q"
            defaultValue={search.q}
            key={search.q}
            maxLength={80}
          />
        </label>
        <label>
          Preço mínimo (ETH)
          <Input
            name="min"
            defaultValue={search.min}
            key={`min-${search.min}`}
            pattern="[0-9]+(\.[0-9]{1,18})?"
          />
        </label>
        <label>
          Preço máximo (ETH)
          <Input
            name="max"
            defaultValue={search.max}
            key={`max-${search.max}`}
            pattern="[0-9]+(\.[0-9]{1,18})?"
          />
        </label>
        <Button>Buscar</Button>
      </form>
      {(['collections', 'networks'] as const).map((kind) => (
        <fieldset key={kind}>
          <legend>{kind === 'collections' ? 'Coleções' : 'Redes'}</legend>
          {(kind === 'collections'
            ? collectionSchema.options
            : networkSchema.options
          ).map((value) => (
            <label key={value}>
              <input
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
              {value} (
              {data?.facets[kind].find((facet) => facet.value === value)
                ?.count ?? 0}
              )
            </label>
          ))}
        </fieldset>
      ))}
      <nav aria-label="Abas do catálogo">
        {catalogTabSchema.options.map((tab) => (
          <Button
            key={tab}
            aria-pressed={search.tab === tab}
            onClick={() => filter({ tab })}
          >
            {{ all: 'Todos', new: 'Novos', trending: 'Em alta' }[tab]}
          </Button>
        ))}
      </nav>
      <label>
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
        error="Não foi possível carregar o catálogo."
      />
      {data && !isPending && !isError && (
        <div aria-busy={isFetching}>
          {data.items.length === 0 ? (
            <AsyncState empty emptyMessage="Nenhum NFT encontrado." />
          ) : (
            <ul>
              {data.items.map((nft) => (
                <li key={nft.id}>
                  <NftCard nft={nft} actions={<FavoriteButton id={nft.id} />} />
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Paginação">
            <Button
              disabled={search.page <= 1 || isFetching}
              onClick={() =>
                void navigate({ search: { ...search, page: search.page - 1 } })
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
                void navigate({ search: { ...search, page: search.page + 1 } })
              }
            >
              Próxima
            </Button>
          </nav>
        </div>
      )}
    </section>
  )
}
