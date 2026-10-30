import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Checkout } from './checkout'
import * as orders from '@/api/orders'
import * as wallets from '@/api/wallets'
import * as quotes from '@/api/quote'
import type { Wallet } from '@/domain/wallet'
import type { Quote } from '@/domain/quote'
import type { Order } from '@/domain/order'

vi.mock('@/api/orders')
vi.mock('@/api/wallets')
vi.mock('@/api/quote')
const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/features/realtime/use-realtime-event', () => ({
  useRealtimeEvent: vi.fn(),
}))
vi.mock('@/features/session/use-session', () => ({
  useSession: () => ({ session: { user: { id: 'user-1' } }, generation: 0 }),
}))
const quote: Quote = {
  id: 'q1',
  cartRevision: 0,
  network: 'ethereum',
  lines: [
    {
      nftId: 'n1',
      editionId: 'e1',
      name: 'Obra',
      tokenId: '1',
      imageUrl: '',
      unitPriceEth: '1',
      quantity: 1,
      lineTotalEth: '1',
      editionVersion: 0,
    },
  ],
  subtotalEth: '1',
  discountEth: '0',
  networkFeeEth: '0.01',
  totalEth: '1.01',
  expiresAt: '2099-01-01T00:00:00Z',
}
const wallet: Wallet = {
  id: 'w1',
  version: 0,
  slot: 'primary',
  displayName: 'Principal',
  nickname: 'wallet',
  network: 'ethereum',
  provider: 'metamask',
  address: `0x${'1'.repeat(40)}`,
  profileName: 'JF',
  referralCode: 'ref',
  email: 'jf@example.com',
  ensName: 'jf.eth',
}
const order: Order = {
  ...quote,
  id: 'o1',
  userId: 'user-1',
  status: 'pending',
  version: 0,
  provider: 'metamask',
  walletAddress: wallet.address,
  createdAt: '2026-01-01T00:00:00Z',
}
function setup() {
  vi.mocked(wallets.getWallets).mockResolvedValue([wallet])
  vi.mocked(quotes.createQuote).mockResolvedValue(quote)
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Checkout />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
async function review(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('1.01 ETH')
  await user.selectOptions(await screen.findByLabelText('Carteira'), 'w1')
  await user.click(screen.getByRole('button', { name: 'Conectar carteira' }))
  await screen.findByText(/Conectada:/)
  for (const label of [
    'Nome de exibição',
    'Usuário',
    'Nome do perfil',
    'Código de indicação',
    'Nome ENS',
  ])
    await user.type(screen.getByLabelText(label), 'JF')
  await user.type(screen.getByLabelText('E-mail'), 'jf@example.com')
  await user.click(screen.getByRole('button', { name: 'Revisar pedido' }))
  await user.click(
    await screen.findByRole('button', { name: 'Aceitar e enviar pedido' }),
  )
}
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.resetAllMocks()
})
it('reenvia a mesma chave e corpo após erro de rede, inclusive ao recarregar', async () => {
  vi.mocked(orders.createOrder)
    .mockRejectedValueOnce(new Error('Network Error'))
    .mockResolvedValue(order)
  // Pedido ainda pendente: ao recarregar, a tentativa salva é retomada com a mesma chave.
  vi.mocked(orders.getOrder).mockResolvedValue({ ...order, status: 'pending' })
  const user = setup()
  await review(user)
  await screen.findByText(/Resultado desconhecido/)
  const [body, key] = vi.mocked(orders.createOrder).mock.calls[0]!
  expect(JSON.parse(localStorage.getItem('kurio:checkout:user-1')!)).toEqual({
    userId: 'user-1',
    key,
    body,
  })
  await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
  await waitFor(() => expect(orders.createOrder).toHaveBeenCalledTimes(2))
  expect(vi.mocked(orders.createOrder).mock.calls[1]!.slice(0, 2)).toEqual([
    body,
    key,
  ])
  cleanup()
  setup()
  await waitFor(() => expect(orders.createOrder).toHaveBeenCalledTimes(3))
  expect(vi.mocked(orders.createOrder).mock.calls[2]!.slice(0, 2)).toEqual([
    body,
    key,
  ])
  expect(localStorage.getItem('kurio:checkout:user-1')).not.toBeNull()
})
it('QUOTE_STALE mostra a nova cotação e exige revisão e aceite antes de nova chave', async () => {
  vi.mocked(orders.createOrder)
    .mockRejectedValueOnce({
      code: 'QUOTE_STALE',
      message: 'Mudou',
      requestId: 'r1',
      quote: { ...quote, id: 'q2', totalEth: '2.01' },
    })
    .mockResolvedValue(order)
  const user = setup()
  await review(user)
  await screen.findByText('2.01 ETH')
  expect(screen.getByText('2.01 ETH')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Aceitar e enviar pedido' }),
  ).not.toBeInTheDocument()
  expect(orders.createOrder).toHaveBeenCalledTimes(1)
  expect(localStorage.getItem('kurio:checkout:user-1')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Revisar pedido' }))
  expect(orders.createOrder).toHaveBeenCalledTimes(1)
  await user.click(
    await screen.findByRole('button', { name: 'Aceitar e enviar pedido' }),
  )
  await waitFor(() => expect(orders.createOrder).toHaveBeenCalledTimes(2))
  const calls = vi.mocked(orders.createOrder).mock.calls
  expect(calls[1]![0].quoteId).toBe('q2')
  expect(calls[1]![1]).not.toBe(calls[0]![1])
})

it('associa o erro do coletor ao campo inválido', async () => {
  const user = setup()
  await screen.findByText('1.01 ETH')
  await user.selectOptions(await screen.findByLabelText('Carteira'), 'w1')
  await user.click(screen.getByRole('button', { name: 'Conectar carteira' }))
  await screen.findByText(/Conectada:/)
  await user.click(screen.getByRole('button', { name: 'Revisar pedido' }))

  const input = screen.getByLabelText('Nome de exibição')
  const error = screen.getByText('Informe o nome de exibição')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAttribute('aria-describedby', error.id)
})

it('recusa de conexão mantém o envio bloqueado', async () => {
  vi.mocked(wallets.connectWallet).mockRejectedValue({
    code: 'CONFLICT',
    message: 'Conexão recusada na carteira',
    requestId: 'r1',
  })
  const user = setup()
  await screen.findByText('1.01 ETH')
  await user.selectOptions(await screen.findByLabelText('Carteira'), 'w1')
  await user.click(screen.getByRole('button', { name: 'Conectar carteira' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Conexão recusada na carteira',
  )
  expect(screen.getByRole('button', { name: 'Revisar pedido' })).toBeDisabled()
  expect(orders.createOrder).not.toHaveBeenCalled()
})

it('remove cupom inválido e refaz a cotação sem ele', async () => {
  localStorage.setItem('kurio:coupon:user-1', 'EXPIRADO')
  vi.mocked(quotes.createQuote)
    .mockRejectedValueOnce({
      code: 'COUPON_EXPIRED',
      message: 'Expirado',
      requestId: 'r1',
    })
    .mockResolvedValueOnce(quote)
  setup()

  expect(await screen.findByRole('alert')).toHaveTextContent('Cupom expirado')
  await waitFor(() => expect(quotes.createQuote).toHaveBeenCalledTimes(2))
  expect(vi.mocked(quotes.createQuote).mock.calls[0]![0]).toEqual({
    network: 'ethereum',
    couponCode: 'EXPIRADO',
  })
  expect(vi.mocked(quotes.createQuote).mock.calls[1]![0]).toEqual({
    network: 'ethereum',
  })
  expect(localStorage.getItem('kurio:coupon:user-1')).toBeNull()
})
