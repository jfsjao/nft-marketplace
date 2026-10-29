import { expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useFavorites } from './favorites'

vi.mock('@/features/session/use-session', () => ({
  useSession: () => ({ session: { user: { id: 'user-1' } }, generation: 0 }),
}))

it('aplica favorito otimista e restaura o cache quando a API falha', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['favorites', 'user-1'], { nftIds: [] })
  vi.spyOn(api, 'get').mockResolvedValue({ data: { nftIds: [] } })
  let reject!: (error: Error) => void
  vi.spyOn(api, 'request').mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      }),
  )
  const { result, unmount } = renderHook(useFavorites, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  act(() => result.current.mutation.mutate({ id: 'nft-1', favorite: true }))
  await waitFor(() =>
    expect(client.getQueryData(['favorites', 'user-1'])).toEqual({
      nftIds: ['nft-1'],
    }),
  )
  act(() => reject(new Error('Falha')))
  await waitFor(() => expect(result.current.mutation.isError).toBe(true))
  expect(client.getQueryData(['favorites', 'user-1'])).toEqual({ nftIds: [] })
  unmount()
  client.clear()
  vi.restoreAllMocks()
})
