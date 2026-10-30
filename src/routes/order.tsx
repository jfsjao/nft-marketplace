import { shortAddress } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrder } from '@/api/orders'
import type { Order as OrderSnapshot } from '@/domain/order'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { useRealtimeEvent } from '@/features/realtime/use-realtime-event'
import { observeRealtime } from '@/lib/socket'
import { clearAttempt, readAttempt } from '@/features/checkout/attempt'
import { OrderSummary } from '@/components/order-summary'
import { LineItem } from '@/components/line-item'
import { AsyncState } from '@/components/async-state'

export function Order() {
  const { orderId } = useParams({ from: '/orders/$orderId' })
  const { session, generation } = useSession()
  return session ? (
    <OrderContents
      key={`${session.user.id}:${generation}:${orderId}`}
      userId={session.user.id}
      generation={generation}
      orderId={orderId}
    />
  ) : null
}

function OrderContents({
  userId,
  generation,
  orderId,
}: {
  userId: string
  generation: number
  orderId: string
}) {
  const client = useQueryClient()
  const key = ['orders', userId, orderId]
  const order = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const result = await getOrder(orderId, signal)
      if (result.userId !== userId) throw new Error('Pedido de outro usuário')
      const cached = client.getQueryData<OrderSnapshot>(key)
      return cached &&
        (cached.version > result.version || cached.status !== 'pending')
        ? cached
        : result
    },
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 2000 : false,
  })
  useRealtimeEvent('order.updated', (event) => {
    if (
      generation === sessionStore.getSnapshot().generation &&
      event.resource.userId === userId &&
      event.resource.orderId === orderId &&
      event.version > (order.data?.version ?? -1)
    )
      void order.refetch()
  })
  const { refetch } = order
  useEffect(
    () =>
      observeRealtime(
        () => {},
        () => {
          if (generation === sessionStore.getSnapshot().generation)
            void refetch()
        },
      ),
    [generation, refetch],
  )
  useEffect(() => {
    if (
      !order.data ||
      order.data.status === 'pending' ||
      generation !== sessionStore.getSnapshot().generation
    )
      return
    const attempt = readAttempt(userId)
    if (attempt?.orderId === orderId) clearAttempt(userId, attempt.key)
    if (order.data.status === 'confirmed')
      void client.invalidateQueries({ queryKey: ['cart', userId] })
  }, [order.data, userId, generation, orderId, client])
  const data = order.data
  return (
    <section className="mx-auto max-w-2xl space-y-6 border-b-8 border-primary bg-card px-5 py-7 md:px-10 md:py-9">
      <h1 className="text-center text-sm text-text-secondary">
        Pedido {orderId}
      </h1>
      <AsyncState
        query={order}
        loading="Carregando pedido…"
        error="Não foi possível carregar o pedido."
      />
      {data && (
        <>
          <img
            src="/assets/illustrations/confirmacao-envelope.png"
            alt=""
            className="mx-auto h-24 w-24 object-contain"
          />
          {data.status === 'confirmed' && (
            <>
              <h2 className="text-center text-lg font-semibold text-primary">
                Pagamento confirmado
              </h2>
              <p className="text-center text-sm text-text-secondary">
                Seus NFTs agora estão na sua carteira
              </p>
            </>
          )}
          <dl className="grid grid-cols-2 gap-5 border-y border-primary/60 py-5 text-xs text-text-secondary md:grid-cols-4">
            <div>
              <dt>ID da transação</dt>
              <dd className="mt-2 break-all">
                {data.transactionHash
                  ? shortAddress(data.transactionHash)
                  : 'Aguardando'}
              </dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd className="mt-2">
                {new Date(data.settledAt ?? data.createdAt).toLocaleDateString(
                  'pt-BR',
                )}
              </dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className="mt-2">{formatEth(data.totalEth)} ETH</dd>
            </div>
            <div>
              <dt>Carteira</dt>
              <dd className="mt-2">
                {data.provider}
                <span className="mt-1 block break-all">
                  {shortAddress(data.walletAddress)}
                </span>
              </dd>
            </div>
          </dl>
        </>
      )}
      {data?.status === 'pending' && (
        <p role="status">Aguardando confirmação do pagamento.</p>
      )}
      {data?.status === 'declined' && (
        <>
          <p role="alert">
            Pagamento recusado:{' '}
            {data.declineReason ?? 'Pagamento não autorizado.'}
          </p>
          <Link to="/cart">Voltar ao carrinho</Link>
        </>
      )}
      {data && (
        <>
          <h2 className="font-semibold">Detalhes da transação</h2>
          <ul className="space-y-3">
            {data.lines.map((item) => (
              <li key={`${item.nftId}:${item.editionId}`}>
                <LineItem item={item} />
              </li>
            ))}
          </ul>
          <OrderSummary snapshot={data} />
          {data.transactionHash && (
            <p className="text-xs text-text-secondary">
              Transação: {data.transactionHash}
            </p>
          )}
          {data.explorerUrl && /^https?:\/\//i.test(data.explorerUrl) && (
            <div className="text-center">
              <Button asChild>
                <a href={data.explorerUrl} target="_blank" rel="noreferrer">
                  Ver no explorador
                </a>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
