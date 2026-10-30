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
    retry: false,
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
    <section>
      <h1>Pedido {orderId}</h1>
      <AsyncState
        query={order}
        loading="Carregando pedido…"
        error="Não foi possível carregar o pedido."
      />
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
      {data?.status === 'confirmed' && (
        <>
          <h2>Pagamento confirmado</h2>
          <ul>
            {data.lines.map((item) => (
              <li key={`${item.nftId}:${item.editionId}`}>
                <LineItem item={item} />
              </li>
            ))}
          </ul>
          <OrderSummary snapshot={data} />
          <p>Transação: {data.transactionHash}</p>
          {data.explorerUrl && /^https?:\/\//i.test(data.explorerUrl) && (
            <a href={data.explorerUrl} target="_blank" rel="noreferrer">
              Ver no explorador
            </a>
          )}
        </>
      )}
    </section>
  )
}
