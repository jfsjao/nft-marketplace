import { networkLabel } from '@/lib/format'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutInputSchema, type CheckoutInput } from '@/domain/order'
import type { Quote } from '@/domain/quote'
import { apiErrorSchema } from '@/domain/errors'
import { networkSchema } from '@/domain/common'
import { connectWallet, getWallets } from '@/api/wallets'
import { createQuote } from '@/api/quote'
import { createOrder, getOrder } from '@/api/orders'
import { getCoupon, setCoupon } from '@/features/cart/coupon'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { useRealtimeEvent } from '@/features/realtime/use-realtime-event'
import {
  clearAttempt,
  readAttempt,
  saveAttempt,
  type Attempt,
} from '@/features/checkout/attempt'
import { OrderSummary } from '@/components/order-summary'
import { LineItem } from '@/components/line-item'
import { AsyncState } from '@/components/async-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Checkout() {
  const { session, generation } = useSession()
  return session ? (
    <CheckoutForm
      key={`${session.user.id}:${generation}`}
      userId={session.user.id}
      generation={generation}
    />
  ) : null
}

function CheckoutForm({
  userId,
  generation,
}: {
  userId: string
  generation: number
}) {
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(() => readAttempt(userId))
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [message, setMessage] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [review, setReview] = useState<CheckoutInput | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectedWalletId, setConnectedWalletId] = useState<string | null>(
    null,
  )
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutInputSchema),
    defaultValues: { network: 'ethereum', provider: 'metamask' },
  })
  const network = useWatch({ control: form.control, name: 'network' })
  const walletId = useWatch({ control: form.control, name: 'walletId' })
  const wallets = useQuery({
    queryKey: ['wallets', userId],
    queryFn: ({ signal }) => getWallets(signal),
  })
  const current = useCallback(
    () => generation === sessionStore.getSnapshot().generation,
    [generation],
  )
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  async function send(saved: Attempt) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setMessage('')
    controller.current = new AbortController()
    try {
      saveAttempt(saved)
      setAttempt(saved)
      const order = await createOrder(
        saved.body,
        saved.key,
        controller.current.signal,
      )
      if (!current()) return
      if (order.status !== 'pending') clearAttempt(userId, saved.key)
      else saveAttempt({ ...saved, orderId: order.id })
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    } catch (error) {
      if (!current()) return
      const parsed = apiErrorSchema.safeParse(error)
      const failure = parsed.success ? parsed.data : null
      if (failure && failure.code !== 'SERVICE_UNAVAILABLE') {
        clearAttempt(userId, saved.key)
        setAttempt(null)
        setReview(null)
        if (failure.code === 'QUOTE_STALE') {
          setQuote(failure.quote ?? null)
          setMessage(
            'Cotação alterada. Revise os novos valores e aceite novamente.',
          )
        } else {
          setMessage(
            failure.code === 'OUT_OF_STOCK'
              ? 'Estoque insuficiente. Volte ao carrinho.'
              : failure.code === 'PAYMENT_DECLINED'
                ? 'Pagamento recusado.'
                : failure.message,
          )
        }
      } else
        setMessage(
          'Resultado desconhecido. Tente de novo com a mesma tentativa.',
        )
    } finally {
      lock.current = false
      if (current()) setBusy(false)
    }
  }
  const quoteRequest = useRef<AbortController | null>(null)
  const refreshQuote = useCallback(async () => {
    quoteRequest.current?.abort()
    const abort = new AbortController()
    quoteRequest.current = abort
    setQuote(null)
    setReview(null)
    try {
      const couponCode = getCoupon(userId)
      let data: Quote
      try {
        data = await createQuote({ network, couponCode }, abort.signal)
      } catch (error) {
        const failure = apiErrorSchema.safeParse(error)
        if (
          !couponCode ||
          !failure.success ||
          !['COUPON_EXPIRED', 'COUPON_INVALID'].includes(failure.data.code)
        )
          throw error
        setCoupon(userId)
        data = await createQuote({ network }, abort.signal)
        setMessage(
          failure.data.code === 'COUPON_EXPIRED'
            ? 'Cupom expirado. A cotação foi atualizada sem cupom.'
            : 'Cupom inválido. A cotação foi atualizada sem cupom.',
        )
      }
      if (!abort.signal.aborted && current()) setQuote(data)
    } catch {
      if (!abort.signal.aborted && current())
        setMessage('Não foi possível obter a cotação.')
    }
  }, [network, userId, current])
  const resume = async (saved: Attempt) => {
    if (saved.orderId) {
      try {
        const order = await getOrder(saved.orderId)
        if (!current()) return
        if (order.status !== 'pending') {
          clearAttempt(userId, saved.key)
          setAttempt(null)
          await refreshQuote()
          return
        }
      } catch {
        if (current())
          setMessage('Não foi possível consultar a tentativa salva.')
        return
      }
    }
    await send(saved)
  }
  useEffect(() => {
    const saved = readAttempt(userId)
    if (saved) void resume(saved)
  }, [])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active && !readAttempt(userId)) void refreshQuote()
    })
    return () => {
      active = false
      quoteRequest.current?.abort()
    }
  }, [userId, refreshQuote])
  useRealtimeEvent('nft.updated', (event) => {
    if (
      attempt ||
      !quote?.lines.some(
        (line) =>
          line.nftId === event.resource.nftId &&
          line.editionId === event.resource.editionId &&
          event.version > line.editionVersion,
      )
    )
      return
    quoteRequest.current?.abort()
    setReview(null)
    setQuote(null)
    setMessage(
      'Preço ou estoque alterado. Atualize a cotação antes de revisar.',
    )
  })
  const selectedWallet = wallets.data?.find((wallet) => wallet.id === walletId)

  async function connect() {
    if (!selectedWallet || connecting) return
    setConnecting(true)
    setMessage('')
    try {
      await connectWallet(selectedWallet.id)
      if (current()) setConnectedWalletId(selectedWallet.id)
    } catch (error) {
      if (!current()) return
      const failure = apiErrorSchema.safeParse(error)
      setMessage(
        failure.success
          ? failure.data.message
          : 'Não foi possível conectar a carteira.',
      )
      setConnectedWalletId(null)
    } finally {
      if (current()) setConnecting(false)
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {message && <p role="alert">{message}</p>}
      {attempt ? (
        <>
          <p role="status">Tentativa de compra em andamento.</p>
          <Button disabled={busy} onClick={() => void resume(attempt)}>
            Tentar de novo
          </Button>
        </>
      ) : (
        <>
          <AsyncState
            query={wallets}
            loading="Carregando carteiras…"
            error="Não foi possível carregar carteiras."
          />
          {wallets.data?.length === 0 ? (
            <Link to="/wallets">Cadastrar carteira</Link>
          ) : (
            <form
              onSubmit={form.handleSubmit((data) => {
                const wallet = wallets.data?.find(
                  (wallet) => wallet.id === data.walletId,
                )
                if (
                  !wallet ||
                  wallet.network !== data.network ||
                  wallet.provider !== data.provider
                ) {
                  form.setError('walletId', {
                    message: 'Selecione uma carteira compatível com a rede.',
                  })
                  return
                }
                if (connectedWalletId !== wallet.id) {
                  form.setError('walletId', {
                    message: 'Conecte a carteira antes de revisar.',
                  })
                  return
                }
                if (quote && quote.network === data.network) setReview(data)
                else setMessage('Atualize a cotação para a rede selecionada.')
              })}
              onChange={() => setReview(null)}
            >
              <fieldset
                disabled={busy}
                className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
              >
                <div className="grid min-w-0 gap-5 text-sm md:grid-cols-2 [&_label]:min-w-0 [&_label]:space-y-2 [&_select]:h-10 [&_select]:w-full">
                  <h2 className="font-semibold md:col-span-2">
                    Perfil do colecionador
                  </h2>
                  {(
                    [
                      'displayName',
                      'username',
                      'profileName',
                      'email',
                      'referralCode',
                      'ensName',
                    ] as const
                  ).map((field) => {
                    const error = form.formState.errors.collector?.[field]
                    const id = `collector-${field}`
                    return (
                      <div key={field}>
                        <label htmlFor={id}>
                          {
                            {
                              displayName: 'Nome de exibição',
                              username: 'Usuário',
                              profileName: 'Nome do perfil',
                              email: 'E-mail',
                              referralCode: 'Código de indicação',
                              ensName: 'Nome ENS',
                            }[field]
                          }
                        </label>
                        <Input
                          id={id}
                          {...form.register(`collector.${field}`)}
                          type={field === 'email' ? 'email' : 'text'}
                          aria-invalid={!!error}
                          aria-describedby={error ? `${id}-error` : undefined}
                        />
                        {error && (
                          <p
                            className="mt-2 text-xs text-destructive"
                            id={`${id}-error`}
                          >
                            {error.message}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <div>
                    <label htmlFor="note">Observação</label>
                    <Input
                      id="note"
                      {...form.register('note')}
                      aria-invalid={!!form.formState.errors.note}
                      aria-describedby={
                        form.formState.errors.note ? 'note-error' : undefined
                      }
                    />
                    {form.formState.errors.note && (
                      <p
                        className="mt-2 text-xs text-destructive"
                        id="note-error"
                      >
                        {form.formState.errors.note.message}
                      </p>
                    )}
                  </div>
                </div>
                <aside className="min-w-0 space-y-5 rounded-2xl bg-card p-5 md:rounded-lg">
                  <h2 className="font-semibold">Seus NFTs</h2>
                  {quote && (
                    <>
                      <ul className="space-y-3">
                        {quote.lines.map((item) => (
                          <li key={`${item.nftId}:${item.editionId}`}>
                            <LineItem item={item} />
                          </li>
                        ))}
                      </ul>
                      <OrderSummary snapshot={quote} />
                    </>
                  )}
                  <Button type="button" onClick={() => void refreshQuote()}>
                    Atualizar cotação
                  </Button>
                  <h3 className="text-sm font-semibold">Carteira e rede</h3>
                  <div className="grid gap-4 text-sm [&_label]:space-y-2 [&_select]:w-full">
                    <div>
                      <label htmlFor="walletId">Carteira</label>
                      <select
                        id="walletId"
                        {...form.register('walletId')}
                        onChange={(event) => {
                          form.setValue('walletId', event.target.value)
                          form.clearErrors('walletId')
                          setConnectedWalletId(null)
                          setReview(null)
                          const wallet = wallets.data?.find(
                            (wallet) => wallet.id === event.target.value,
                          )
                          if (wallet) {
                            form.setValue('network', wallet.network)
                            form.setValue('provider', wallet.provider)
                          }
                        }}
                        aria-invalid={!!form.formState.errors.walletId}
                        aria-describedby={
                          form.formState.errors.walletId
                            ? 'walletId-error'
                            : undefined
                        }
                      >
                        <option value="">Selecione</option>
                        {wallets.data?.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.displayName} — {wallet.address}
                          </option>
                        ))}
                      </select>
                      {form.formState.errors.walletId && (
                        <p
                          className="mt-2 text-xs text-destructive"
                          id="walletId-error"
                        >
                          {form.formState.errors.walletId.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="network">Rede</label>
                      <select
                        id="network"
                        {...form.register('network')}
                        onChange={(event) => {
                          form.setValue(
                            'network',
                            networkSchema.parse(event.target.value),
                          )
                          setConnectedWalletId(null)
                          setReview(null)
                        }}
                        aria-invalid={!!form.formState.errors.network}
                        aria-describedby={
                          form.formState.errors.network
                            ? 'network-error'
                            : undefined
                        }
                      >
                        {networkSchema.options.map((value) => (
                          <option key={value} value={value}>
                            {networkLabel[value]}
                          </option>
                        ))}
                      </select>
                      {form.formState.errors.network && (
                        <p
                          className="mt-2 text-xs text-destructive"
                          id="network-error"
                        >
                          {form.formState.errors.network.message}
                        </p>
                      )}
                    </div>
                    {connectedWalletId === selectedWallet?.id ? (
                      <div className="space-y-2">
                        <p role="status">
                          Conectada: {selectedWallet.address.slice(0, 6)}…
                          {selectedWallet.address.slice(-4)}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setConnectedWalletId(null)
                            setReview(null)
                          }}
                        >
                          Desconectar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!selectedWallet || connecting}
                        onClick={() => void connect()}
                      >
                        {connecting ? 'Conectando…' : 'Conectar carteira'}
                      </Button>
                    )}
                  </div>
                  <Button
                    className="h-12 w-full rounded-full md:rounded-md"
                    type="submit"
                    disabled={!quote || connectedWalletId !== walletId}
                  >
                    Revisar pedido
                  </Button>
                </aside>
              </fieldset>
            </form>
          )}
          {review && quote && (
            <section
              aria-label="Revisão do pedido"
              className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-card p-5 md:p-8"
            >
              <h2 className="text-lg font-semibold">
                Revise e aceite a compra
              </h2>
              <p>
                Carteira:{' '}
                {
                  wallets.data?.find((wallet) => wallet.id === review.walletId)
                    ?.address
                }
                ; rede: {review.network}; provedor: {review.provider}
              </p>
              <dl>
                {Object.entries(review.collector).map(([field, value]) => (
                  <div key={field}>
                    <dt>
                      {
                        {
                          displayName: 'Nome de exibição',
                          username: 'Usuário',
                          profileName: 'Nome do perfil',
                          email: 'E-mail',
                          referralCode: 'Código de indicação',
                          ensName: 'Nome ENS',
                        }[field as keyof CheckoutInput['collector']]
                      }
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {review.note && <p>Observação: {review.note}</p>}
              <ul className="space-y-3">
                {quote.lines.map((item) => (
                  <li key={`${item.nftId}:${item.editionId}`}>
                    <LineItem item={item} />
                  </li>
                ))}
              </ul>
              <OrderSummary snapshot={quote} />
              <Button
                className="h-12 w-full"
                disabled={busy || connectedWalletId !== review.walletId}
                onClick={() => {
                  if (connectedWalletId !== review.walletId) return
                  void send({
                    userId,
                    key: crypto.randomUUID(),
                    body: { ...review, quoteId: quote.id },
                  })
                }}
              >
                Aceitar e enviar pedido
              </Button>
            </section>
          )}
        </>
      )}
      <Link to="/cart">Voltar ao carrinho</Link>
    </section>
  )
}
