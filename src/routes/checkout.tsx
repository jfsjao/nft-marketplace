import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { checkoutInputSchema, type CheckoutInput } from '@/domain/order'
import type { Quote } from '@/domain/quote'
import { apiErrorSchema } from '@/domain/errors'
import { networkSchema } from '@/domain/common'
import { getWallets } from '@/api/wallets'
import { createQuote } from '@/api/quote'
import { createOrder } from '@/api/orders'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { useRealtimeEvent } from '@/features/realtime/use-realtime-event'
import {
  clearAttempt,
  readAttempt,
  saveAttempt,
  type Attempt,
} from '@/features/checkout/attempt'
import { Totals } from '@/features/checkout/totals'
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
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutInputSchema),
    defaultValues: { network: 'ethereum', provider: 'metamask' },
  })
  const network = useWatch({ control: form.control, name: 'network' })
  const wallets = useQuery({
    queryKey: ['wallets', userId],
    queryFn: ({ signal }) => getWallets(signal),
    retry: false,
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
  const resume = useEffectEvent(() => {
    const saved = readAttempt(userId)
    if (saved) void send(saved)
  })
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) resume()
    })
    return () => {
      active = false
    }
  }, [])
  const quoteRequest = useRef<AbortController | null>(null)
  const refreshQuote = useCallback(async () => {
    quoteRequest.current?.abort()
    const abort = new AbortController()
    quoteRequest.current = abort
    setQuote(null)
    setReview(null)
    try {
      const data = await createQuote({ network }, abort.signal)
      if (!abort.signal.aborted && current()) setQuote(data)
    } catch {
      if (!abort.signal.aborted && current())
        setMessage('Não foi possível obter a cotação.')
    }
  }, [network, current])
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

  return (
    <section>
      <h1>Checkout</h1>
      {message && <p role="alert">{message}</p>}
      {attempt ? (
        <>
          <p role="status">Tentativa de compra em andamento.</p>
          <Button disabled={busy} onClick={() => void send(attempt)}>
            Tentar de novo
          </Button>
        </>
      ) : (
        <>
          {wallets.isPending && <p role="status">Carregando carteiras…</p>}
          {wallets.isError && (
            <p role="alert">
              Não foi possível carregar carteiras.{' '}
              <Button onClick={() => void wallets.refetch()}>
                Tentar novamente
              </Button>
            </p>
          )}
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
                if (quote && quote.network === data.network) setReview(data)
                else setMessage('Atualize a cotação para a rede selecionada.')
              })}
              onChange={() => setReview(null)}
            >
              <fieldset disabled={busy}>
                <label>
                  Carteira
                  <select
                    {...form.register('walletId')}
                    onChange={(event) => {
                      form.setValue('walletId', event.target.value)
                      const wallet = wallets.data?.find(
                        (wallet) => wallet.id === event.target.value,
                      )
                      if (wallet) {
                        form.setValue('network', wallet.network)
                        form.setValue('provider', wallet.provider)
                      }
                    }}
                  >
                    <option value="">Selecione</option>
                    {wallets.data?.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.displayName} — {wallet.address}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Rede
                  <select {...form.register('network')}>
                    {networkSchema.options.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    'displayName',
                    'username',
                    'profileName',
                    'email',
                    'referralCode',
                    'ensName',
                  ] as const
                ).map((field) => (
                  <label key={field}>
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
                    <Input
                      {...form.register(`collector.${field}`)}
                      type={field === 'email' ? 'email' : 'text'}
                    />
                  </label>
                ))}
                <label>
                  Observação
                  <Input {...form.register('note')} />
                </label>
                {Object.values(form.formState.errors).map((error, index) => (
                  <p role="alert" key={index}>
                    {error.message ?? 'Revise os campos do coletor.'}
                  </p>
                ))}
                {quote && (
                  <>
                    <p>
                      Cotação {quote.id} — {quote.network}
                    </p>
                    <Totals snapshot={quote} />
                  </>
                )}
                <Button type="button" onClick={() => void refreshQuote()}>
                  Atualizar cotação
                </Button>
                <Button type="submit" disabled={!quote}>
                  Revisar pedido
                </Button>
              </fieldset>
            </form>
          )}
          {review && quote && (
            <section aria-label="Revisão do pedido">
              <h2>Revise e aceite a compra</h2>
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
              <Totals snapshot={quote} />
              <Button
                disabled={busy}
                onClick={() =>
                  void send({
                    userId,
                    key: crypto.randomUUID(),
                    body: { ...review, quoteId: quote.id },
                  })
                }
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
