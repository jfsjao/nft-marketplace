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
    <section aria-labelledby="cart-title">
      <h1 id="cart-title">Carrinho</h1>
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
            <>
              <ul>
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
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ item })}
                      >
                        Remover {item.name}
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
              <p>
                Subtotal: <EthPrice value={cart.data.subtotalEth} />
              </p>
              {status === 'authenticated' ? (
                <>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (coupon.trim() === appliedCoupon) void quote.refetch()
                      else setAppliedCoupon(coupon.trim())
                    }}
                  >
                    <label htmlFor="coupon">Cupom</label>
                    <Input
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
              <Button asChild disabled={mutation.isPending}>
                <Link to="/checkout">Finalizar</Link>
              </Button>
            </>
          )}
        </>
      )}
    </section>
  )
}
