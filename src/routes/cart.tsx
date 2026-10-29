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
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'

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
      {cart.isPending && (
        <Skeleton aria-label="Carregando carrinho" className="h-20" />
      )}
      {cart.isError && (
        <div role="alert">
          Não foi possível carregar o carrinho.{' '}
          <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
        </div>
      )}
      {cart.data && (
        <>
          {!cart.data.items.length ? (
            <p>Seu carrinho está vazio.</p>
          ) : (
            <>
              <ul>
                {cart.data.items.map((item) => (
                  <li key={`${item.nftId}:${item.editionId}`}>
                    <h2>
                      {item.name} — {item.editionLabel}
                    </h2>
                    <p>
                      {formatEth(item.unitPriceEth)} ETH por unidade;{' '}
                      {formatEth(item.lineTotalEth)} ETH
                    </p>
                    <label>
                      Quantidade de {item.name}
                      <Input
                        type="number"
                        min={1}
                        max={item.availableQuantity}
                        value={item.quantity}
                        disabled={mutation.isPending}
                        onChange={(event) => {
                          const quantity = event.target.valueAsNumber
                          if (
                            Number.isInteger(quantity) &&
                            quantity >= 1 &&
                            quantity <= item.availableQuantity &&
                            quantity !== item.quantity
                          )
                            mutation.mutate({ item, quantity })
                        }}
                      />
                    </label>
                    <Button
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ item })}
                    >
                      Remover {item.name}
                    </Button>
                  </li>
                ))}
              </ul>
              {mutation.isError && (
                <div role="alert">
                  {(mutation.error as unknown as ApiError).message ??
                    'Não foi possível alterar o carrinho.'}
                  <Button
                    onClick={() =>
                      mutation.variables && mutation.mutate(mutation.variables)
                    }
                  >
                    Tentar novamente
                  </Button>
                </div>
              )}
              <p>Subtotal: {formatEth(cart.data.subtotalEth)} ETH</p>
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
                  {quote.isFetching && (
                    <Skeleton
                      aria-label="Carregando cotação"
                      className="h-20"
                    />
                  )}
                  {quote.isError && !invalidCoupon && (
                    <div role="alert">
                      Não foi possível obter a cotação.{' '}
                      <Button onClick={() => void quote.refetch()}>
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                  {quote.data && !quote.isFetching && !cart.isFetching && (
                    <dl>
                      <dt>Subtotal</dt>
                      <dd>{formatEth(quote.data.subtotalEth)} ETH</dd>
                      <dt>Desconto</dt>
                      <dd>{formatEth(quote.data.discountEth)} ETH</dd>
                      <dt>Taxa de rede</dt>
                      <dd>{formatEth(quote.data.networkFeeEth)} ETH</dd>
                      <dt>Total</dt>
                      <dd>{formatEth(quote.data.totalEth)} ETH</dd>
                    </dl>
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
