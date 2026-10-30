import { listNfts } from '@/api/nfts'
import { NftCard } from '@/components/nft-card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { api } from '@/api/client'
import { nftDetailSchema } from '@/domain/nft'
import { apiErrorSchema } from '@/domain/errors'
import { cartSchema } from '@/domain/cart'
import { Button } from '@/components/ui/button'
import { QuantityInput } from '@/components/quantity-input'
import { EthPrice } from '@/components/eth-price'
import { AsyncState } from '@/components/async-state'
import { FavoriteButton } from '@/features/catalog/favorites'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'

export function Nft() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(0)
  const client = useQueryClient()
  const { session, guestId, generation } = useSession()
  const [editionId, setEditionId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const detail = useQuery({
    queryKey: ['nft', nftId],
    structuralSharing: (old, fresh) => {
      const next = nftDetailSchema.parse(fresh)
      const previous = nftDetailSchema.safeParse(old).data
      if (!previous) return next
      return {
        ...(previous.version > next.version ? previous : next),
        editions: next.editions.map((edition) => {
          const cached = previous.editions.find(
            (item) => item.id === edition.id,
          )
          return cached && cached.version > edition.version ? cached : edition
        }),
      }
    },
    queryFn: async ({ signal }) =>
      nftDetailSchema.parse(
        (await api.get(`/nfts/${encodeURIComponent(nftId)}`, { signal })).data,
      ),
  })
  const related = useQuery({
    queryKey: ['nfts-related', detail.data?.collection, nftId],
    queryFn: ({ signal }) =>
      listNfts({ collections: [detail.data!.collection], pageSize: 6 }, signal),
    enabled: !!detail.data,
  })
  const edition =
    detail.data?.editions.find((item) => item.id === editionId) ??
    detail.data?.editions.find((item) => item.availableQuantity > 0)
  const amount = Math.min(quantity, edition?.availableQuantity ?? 0)
  const cart = useMutation({
    mutationFn: async () =>
      cartSchema.parse(
        (
          await api.post('/cart/items', {
            nftId,
            editionId: edition?.id,
            quantity: amount,
          })
        ).data,
      ),
    onSuccess: () => {
      if (sessionStore.getSnapshot().generation === generation)
        void client.invalidateQueries({
          queryKey: ['cart', session?.user.id ?? guestId],
        })
    },
  })
  if (detail.isPending || detail.isError)
    return (
      <AsyncState
        query={detail}
        loading="Carregando NFT"
        layout="detail"
        error={
          <h1>
            {apiErrorSchema.safeParse(detail.error).data?.code === 'NOT_FOUND'
              ? 'NFT não encontrado'
              : 'Não foi possível carregar o NFT'}
          </h1>
        }
      />
    )
  const nft = detail.data
  return (
    <article className="min-w-0">
      <p className="mb-5 text-xs text-text-secondary">
        <a href="/">Início</a> / {nft.name}
      </p>
      <div className="grid min-w-0 gap-6 md:grid-cols-2 md:gap-8 lg:gap-12">
        <section aria-label="Galeria" className="min-w-0">
          <div className="rounded-3xl bg-card p-3 md:rounded-lg md:p-4">
            <img
              src={nft.gallery[selectedImage] ?? nft.imageUrl}
              alt={`${nft.name}, imagem ${selectedImage + 1}`}
              width={600}
              height={600}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          </div>
          {nft.gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {nft.gallery.map((image, index) => (
                <button
                  key={image}
                  aria-label={`Ver imagem ${index + 1}`}
                  aria-pressed={selectedImage === index}
                  className="rounded-lg border-2 border-transparent p-1 aria-pressed:border-primary"
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={image}
                    alt=""
                    className="aspect-square w-full rounded-md object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>
        <div className="min-w-0 space-y-5 rounded-3xl bg-card p-5 md:rounded-none md:bg-transparent md:p-0">
          <h1 className="text-2xl font-bold lg:text-3xl">{nft.name}</h1>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <p className="text-xl">
              <EthPrice
                value={edition?.priceEth ?? nft.priceEth}
                compareAt={nft.compareAtPriceEth}
              />
            </p>
            <p className="text-xs text-text-secondary">
              <span className="text-primary" aria-hidden="true">
                ★
              </span>{' '}
              {nft.rating.average} ({nft.rating.count} avaliações)
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold">Sobre este NFT:</h2>
            <p className="text-sm leading-7 text-text-secondary">
              {nft.description}
            </p>
          </div>
          <fieldset>
            <legend className="mb-3 font-semibold">Edições</legend>
            <div className="flex flex-wrap gap-2">
              {nft.editions.map((item) => (
                <label
                  key={item.id}
                  className="relative cursor-pointer rounded-full border px-3 py-2 text-xs text-text-secondary has-[:checked]:border-primary has-[:checked]:text-highlight has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="edition"
                    checked={edition?.id === item.id}
                    disabled={item.availableQuantity === 0}
                    onChange={() => {
                      setEditionId(item.id)
                      setQuantity(1)
                    }}
                  />
                  {item.label}
                  <span className="sr-only">
                    : <EthPrice value={item.priceEth} /> —{' '}
                    {item.availableQuantity
                      ? `${item.availableQuantity} disponíveis`
                      : 'Esgotada'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {!edition && <p>Nenhuma edição disponível.</p>}
          <QuantityInput
            value={amount}
            max={edition?.availableQuantity ?? 0}
            disabled={!amount}
            onChange={setQuantity}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-12 flex-1 rounded-full md:rounded-md"
              disabled={!amount || cart.isPending}
              onClick={() =>
                cart.mutate(undefined, {
                  onSuccess: () => void navigate({ to: '/checkout' }),
                })
              }
            >
              Comprar NFT
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full md:rounded-md"
              disabled={!amount || cart.isPending}
              onClick={() => cart.mutate()}
            >
              Adicionar ao carrinho
            </Button>
          </div>
          <div className="[&_button]:border [&_button]:bg-transparent [&_button]:text-primary">
            <FavoriteButton id={nft.id} />
          </div>
          <AsyncState
            isError={cart.isError}
            error={
              apiErrorSchema.safeParse(cart.error).data?.message ??
              'Não foi possível adicionar ao carrinho.'
            }
            refetch={() => cart.mutate()}
          />
          {cart.isSuccess && <p role="status">Adicionado ao carrinho.</p>}
          <dl className="space-y-3 text-sm text-muted-foreground">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">#{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">
                {nft.collectionName} — {nft.network}
              </dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Tabs defaultValue="details" className="mt-12 md:mt-20">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-3 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="details"
            className="rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Detalhes do NFT
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent py-3 data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            Avaliações de colecionadores ({nft.rating.count})
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="details"
          className="space-y-5 pt-4 text-sm leading-7 text-muted-foreground"
        >
          <p>{nft.longDescription}</p>
          <p>
            <strong className="text-foreground">Rede:</strong>
            <br />
            {nft.network}
          </p>
          <p>
            <strong className="text-foreground">Contrato:</strong>
            <br />
            {nft.contractAddress} · {nft.tokenStandard}
          </p>
          <p>
            <strong className="text-foreground">Direitos autorais:</strong>
            <br />
            {nft.royaltyPercent}% nas vendas secundárias.
          </p>
        </TabsContent>
        <TabsContent
          value="reviews"
          className="py-6 text-sm text-text-secondary"
        >
          Nota média: {nft.rating.average} de 5, em {nft.rating.count}{' '}
          avaliações de colecionadores.
        </TabsContent>
      </Tabs>
      <section className="mt-14 md:mt-20" aria-label="Mais desta coleção">
        <h2 className="mb-6 border-b pb-3 text-lg font-semibold text-primary">
          Mais desta coleção
        </h2>
        <AsyncState
          query={related}
          loading="Carregando coleção"
          error="Não foi possível carregar a coleção."
          className="h-72"
        />
        {related.data && (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {related.data.items
              .filter((item) => item.id !== nft.id)
              .slice(0, 5)
              .map((item) => (
                <li key={item.id}>
                  <NftCard nft={item} />
                </li>
              ))}
          </ul>
        )}
      </section>
    </article>
  )
}
