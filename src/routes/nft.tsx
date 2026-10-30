import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
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
    <article>
      <h1>{nft.name}</h1>
      <p>{nft.description}</p>
      <section aria-label="Galeria">
        {nft.gallery.map((image, index) => (
          <img
            key={image}
            src={image}
            alt={`${nft.name}, imagem ${index + 1}`}
            width={240}
            height={240}
          />
        ))}
      </section>
      <p>{nft.longDescription}</p>
      <p>
        {nft.collectionName} — {nft.network}
      </p>
      <ul>
        {nft.attributes.map((attribute) => (
          <li key={attribute}>{attribute}</li>
        ))}
      </ul>
      <fieldset>
        <legend>Edições</legend>
        {nft.editions.map((item) => (
          <label key={item.id}>
            <input
              type="radio"
              name="edition"
              checked={edition?.id === item.id}
              disabled={item.availableQuantity === 0}
              onChange={() => {
                setEditionId(item.id)
                setQuantity(1)
              }}
            />
            {item.label}: <EthPrice value={item.priceEth} /> —{' '}
            {item.availableQuantity
              ? `${item.availableQuantity} disponíveis`
              : 'Esgotada'}
          </label>
        ))}
      </fieldset>
      {!edition && <p>Nenhuma edição disponível.</p>}
      <QuantityInput
        value={amount}
        max={edition?.availableQuantity ?? 0}
        disabled={!amount}
        onChange={setQuantity}
      />
      <Button
        disabled={!amount || cart.isPending}
        onClick={() => cart.mutate()}
      >
        Adicionar ao carrinho
      </Button>
      <AsyncState
        isError={cart.isError}
        error={
          apiErrorSchema.safeParse(cart.error).data?.message ??
          'Não foi possível adicionar ao carrinho.'
        }
        refetch={() => cart.mutate()}
      />
      {cart.isSuccess && <p role="status">Adicionado ao carrinho.</p>}
      <FavoriteButton id={nft.id} />
    </article>
  )
}
