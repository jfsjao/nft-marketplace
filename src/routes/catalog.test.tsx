import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import { listNfts } from '@/api/nfts'

vi.mock('@/api/nfts', () => ({ listNfts: vi.fn() }))

it('consulta o catálogo com os filtros combinados da URL', async () => {
  vi.mocked(listNfts).mockResolvedValue({
    items: [],
    facets: { collections: [], networks: [] },
    page: 2,
    pageSize: 9,
    total: 0,
    totalPages: 0,
  })
  const history = createMemoryHistory({
    initialEntries: [
      '/?q=arte&collections=%5B%22music%22%5D&networks=%5B%22polygon%22%5D&min=0.1&max=2&tab=new&sort=price-asc&page=2',
    ],
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  router.update({
    history,
    context: { queryClient: client, auth: { userId: null, status: 'guest' } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  expect(
    await screen.findByText('Nenhum NFT encontrado.', {}, { timeout: 3000 }),
  ).toBeInTheDocument()
  expect(listNfts).toHaveBeenCalledWith(
    {
      search: 'arte',
      collections: ['music'],
      networks: ['polygon'],
      minPriceEth: '0.1',
      maxPriceEth: '2',
      tab: 'new',
      sort: 'price-asc',
      page: 2,
      pageSize: 9,
    },
    expect.any(AbortSignal),
  )
  expect(screen.getByLabelText('Busca')).toHaveValue('arte')
  view.unmount()
  client.clear()
})
