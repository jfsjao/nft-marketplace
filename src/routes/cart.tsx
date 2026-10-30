import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCart, updateCartItem, removeCartItem } from '@/api/cart'
import { createQuote } from '@/api/quote'
import type { CartItem } from '@/domain/cart'
import type { ApiError } from '@/domain/errors'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { useRealtimeEvent } from '@/features/realtime/use-realtime-event'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AsyncState } from '@/components/async-state'
import { EthPrice } from '@/components/eth-price'
import { LineItem } from '@/components/line-item'
import { QuantityInput } from '@/components/quantity-input'
import { OrderSummary } from '@/components/order-summary'

export function Cart() {
  const { session, guestId, generation } = useSession()
  const owner = session?.user.id ?? guestId
  return <CartContents key={`${owner}:${generation}`} />
}

function CartContents() {
  const { session, guestId, generation, status } = useSession()
  const client = useQueryClient()
  const cartKey = ['cart', session?.user.id ?? guestId]
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [notice, setNotice] = useState('')
  const cart = useQuery({
    queryKey: cartKey,
    queryFn: ({ signal }) => getCart(signal),
    enabled: status !== 'unknown',
    retry: false,
  })
  const quoteKey = [
    'quote',
    session?.user.id,
    cart.data?.revision,
    appliedCoupon,
  ]
  const quote = useQuery({
    queryKey: quoteKey,
    queryFn: ({ signal }) =>
      createQuote({ couponCode: appliedCoupon || undefined }, signal),
    enabled:
      status === 'authenticated' &&
      !!cart.data?.items.length &&
      !cart.isFetching,
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: ({ item, quantity }: { item: CartItem; quantity?: number }) =>
      quantity === undefined
        ? removeCartItem(item)
        : updateCartItem(item, quantity),
    onSuccess: async (data) => {
      if (generation !== sessionStore.getSnapshot().generation) return
      await client.cancelQueries({ queryKey: cartKey })
      if (generation !== sessionStore.getSnapshot().generation) return
      client.setQueryData(cartKey, data)
      void client.invalidateQueries({ queryKey: ['quote', session?.user.id] })
    },
  })
  useRealtimeEvent('nft.updated', (event) => {
    if (
      !cart.data?.items.some(
        (item) =>
          item.nftId === event.resource.nftId &&
          item.editionId === event.resource.editionId &&
          event.version > item.editionVersion,
      )
    )
      return
    setNotice('Preço ou estoque alterado. Confira o carrinho atualizado.')
    void client
      .cancelQueries({ queryKey: cartKey })
      .then(() => client.invalidateQueries({ queryKey: cartKey }))
    void client
      .cancelQueries({ queryKey: ['quote', session?.user.id] })
      .then(() =>
        client.invalidateQueries({ queryKey: ['quote', session?.user.id] }),
      )
  })
  const couponError = quote.error as ApiError | null
  const invalidCoupon =
    couponError?.code === 'COUPON_INVALID' ||
    couponError?.code === 'COUPON_EXPIRED'
  return (
    <section aria-labelledby="cart-title" className="space-y-6">
      <h1 id="cart-title" className="text-2xl font-bold">
        Carrinho
      </h1>
      {notice && <p role="status">{notice}</p>}
      {cart.data?.adjustments.map((adjustment, index) => (
        <p role="status" key={index}>
          {adjustment.message}
        </p>
      ))}
      <AsyncState
        query={cart}
        loading="Carregando carrinho"
        error="Não foi possível carregar o carrinho."
        className="h-20"
      />
      {cart.data && (
        <>
          {!cart.data.items.length ? (
            <AsyncState empty emptyMessage="Seu carrinho está vazio." />
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)] lg:gap-12">
              <div className="min-w-0">
                <div
                  aria-hidden="true"
                  className="mb-3 hidden grid-cols-[minmax(0,2fr)_minmax(90px,1fr)_144px_minmax(90px,1fr)_40px] gap-3 border-b px-3 pb-3 text-sm md:grid"
                >
                  <span>NFTs</span>
                  <span>Preço</span>
                  <span>Edições</span>
                  <span>Total</span>
                </div>
                <ul className="space-y-3">
                  {cart.data.items.map((item) => (
                    <li key={`${item.nftId}:${item.editionId}`}>
                      <LineItem
                        item={item}
                        quantity={
                          <QuantityInput
                            label={`Quantidade de ${item.name}`}
                            value={item.quantity}
                            max={item.availableQuantity}
                            disabled={mutation.isPending}
                            onChange={(quantity) =>
                              mutation.mutate({ item, quantity })
                            }
                          />
                        }
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary"
                          aria-label={`Remover ${item.name}`}
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ item })}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </LineItem>
                    </li>
                  ))}
                </ul>
                <AsyncState
                  isError={mutation.isError}
                  error={
                    (mutation.error as ApiError | null)?.message ??
                    'Não foi possível alterar o carrinho.'
                  }
                  refetch={() =>
                    mutation.variables && mutation.mutate(mutation.variables)
                  }
                />
              </div>
              <aside className="min-w-0 space-y-5 rounded-2xl bg-card p-5 md:rounded-lg lg:bg-transparent lg:p-0">
                <h2 className="border-b pb-3 font-semibold">
                  Resumo da carteira
                </h2>
                {(!quote.data || quote.isFetching || cart.isFetching) && (
                  <p className="flex justify-between gap-3 text-sm">
                    Subtotal: <EthPrice value={cart.data.subtotalEth} />
                  </p>
                )}
                {status === 'authenticated' ? (
                  <>
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (coupon.trim() === appliedCoupon)
                          void quote.refetch()
                        else setAppliedCoupon(coupon.trim())
                      }}
                    >
                      <label htmlFor="coupon">Cupom</label>
                      <Input
                        placeholder="Digite o código promocional..."
                        id="coupon"
                        value={coupon}
                        onChange={(event) => setCoupon(event.target.value)}
                        aria-invalid={invalidCoupon}
                        aria-describedby={
                          invalidCoupon ? 'coupon-error' : undefined
                        }
                      />
                      {invalidCoupon && (
                        <p id="coupon-error" role="alert">
                          {couponError.message}
                        </p>
                      )}
                      <Button
                        type="submit"
                        disabled={quote.isFetching || mutation.isPending}
                      >
                        Aplicar cupom
                      </Button>
                      {appliedCoupon && (
                        <Button
                          type="button"
                          onClick={() => {
                            setCoupon('')
                            setAppliedCoupon('')
                          }}
                        >
                          Remover cupom
                        </Button>
                      )}
                    </form>
                    <AsyncState
                      isPending={quote.isFetching}
                      isError={quote.isError && !invalidCoupon}
                      refetch={quote.refetch}
                      loading="Carregando cotação"
                      error="Não foi possível obter a cotação."
                      className="h-20"
                    />
                    {quote.data && !quote.isFetching && !cart.isFetching && (
                      <OrderSummary snapshot={quote.data} />
                    )}
                  </>
                ) : (
                  <p>
                    Entre na sua conta para aplicar cupom e consultar taxa e
                    total.
                  </p>
                )}
                <Button
                  asChild
                  disabled={mutation.isPending}
                  className="h-12 w-full rounded-full md:rounded-md"
                >
                  <Link to="/checkout" aria-label="Finalizar">
                    Conectar e finalizar
                  </Link>
                </Button>
                <Link
                  to="/"
                  search={{
                    q: '',
                    collections: [],
                    networks: [],
                    tab: 'all',
                    sort: 'recent',
                    page: 1,
                  }}
                  className="block text-center text-sm text-primary"
                >
                  Continuar explorando
                </Link>
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  )
}
