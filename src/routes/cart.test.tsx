import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Cart } from './cart'
import * as cartApi from '@/api/cart'
import * as quoteApi from '@/api/quote'

vi.mock('@/api/cart')
vi.mock('@/api/quote')
vi.mock('@/features/realtime/use-realtime-event', () => ({
  useRealtimeEvent: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/checkout">{children}</a>
  ),
}))
vi.mock('@/features/session/use-session', () => ({
  useSession: () => ({
    session: { user: { id: 'user-1' } },
    guestId: 'guest-1',
    generation: 0,
    status: 'authenticated',
  }),
}))

const item = {
  nftId: 'n1',
  editionId: 'e1',
  name: 'Obra',
  tokenId: '1',
  imageUrl: '',
  editionLabel: 'Comum',
  unitPriceEth: '1',
  quantity: 1,
  availableQuantity: 3,
  lineTotalEth: '1',
  editionVersion: 0,
}
const cart = {
  ownerId: 'user-1',
  items: [item],
  itemCount: 1,
  subtotalEth: '1',
  revision: 0,
  adjustments: [],
}
const quote = {
  id: 'q1',
  cartRevision: 0,
  network: 'ethereum' as const,
  lines: [item],
  subtotalEth: '1',
  discountEth: '0',
  networkFeeEth: '0.01',
  totalEth: '1.01',
  expiresAt: '2099-01-01T00:00:00.000Z',
}
function setup() {
  vi.mocked(cartApi.getCart).mockResolvedValue(cart)
  vi.mocked(quoteApi.createQuote).mockResolvedValue(quote)
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <Cart />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
it('altera a quantidade dentro do estoque e remove o item pela API', async () => {
  const user = setup()
  vi.mocked(cartApi.updateCartItem).mockResolvedValue({
    ...cart,
    revision: 1,
    items: [{ ...item, quantity: 2, lineTotalEth: '2' }],
    subtotalEth: '2',
  })
  vi.mocked(cartApi.removeCartItem).mockResolvedValue({
    ...cart,
    revision: 2,
    items: [],
    itemCount: 0,
    subtotalEth: '0',
  })
  const input = await screen.findByLabelText('Quantidade de Obra')
  fireEvent.change(input, { target: { value: '2' } })
  await waitFor(() =>
    expect(cartApi.updateCartItem).toHaveBeenCalledWith(item, 2),
  )
  await waitFor(() => expect(input).toHaveValue(2))
  expect(input).toHaveAttribute('max', '3')
  await user.click(screen.getByRole('button', { name: 'Remover Obra' }))
  expect(
    await screen.findByText('Seu carrinho está vazio.'),
  ).toBeInTheDocument()
  expect(cartApi.removeCartItem).toHaveBeenCalled()
})
it('associa a mensagem de cupom inválido ao campo', async () => {
  const user = setup()
  await screen.findByText('1.01 ETH')
  vi.mocked(quoteApi.createQuote).mockRejectedValue({
    code: 'COUPON_INVALID',
    message: 'Cupom inválido',
    requestId: 'r1',
  })
  await user.type(screen.getByLabelText('Cupom'), 'INVALIDO')
  await user.click(screen.getByRole('button', { name: 'Aplicar cupom' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Cupom inválido')
  expect(screen.getByLabelText('Cupom')).toHaveAccessibleDescription(
    'Cupom inválido',
  )
  expect(screen.getByLabelText('Cupom')).toHaveAttribute('aria-invalid', 'true')
})
