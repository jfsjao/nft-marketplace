// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { handlers } from '@/mocks/handlers'
import { api } from './client'
import { listNfts } from './nfts'

const server = setupServer(...handlers)

beforeAll(() => {
  api.defaults.baseURL = 'http://localhost/api'
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('listNfts via Axios e MSW', () => {
  it('recebe as quatro artes e mantém o preço como string', async () => {
    const result = await listNfts()
    expect(result.total).toBe(4)
    expect(result.items[0].priceEth).toBe('1.19')
    expect(result.items[0].imageUrl).toBe('/assets/nfts/ape-esmeralda.png')
  })

  it('aceita resultado vazio', async () => {
    const empty = {
      items: [],
      page: 1,
      pageSize: 9,
      total: 0,
      totalPages: 0,
      facets: { collections: [], networks: [] },
    }
    server.use(http.get('*/api/nfts', () => HttpResponse.json(empty)))
    expect(await listNfts()).toEqual(empty)
  })

  it('rejeita erro HTTP sem devolver sucesso falso', async () => {
    server.use(
      http.get('*/api/nfts', () => new HttpResponse(null, { status: 503 })),
    )
    await expect(listNfts()).rejects.toMatchObject({
      response: { status: 503 },
    })
  })

  it('rejeita resposta fora do contrato', async () => {
    server.use(
      http.get('*/api/nfts', () =>
        HttpResponse.json({ items: [{ priceEth: 1.19 }], total: 1 }),
      ),
    )
    await expect(listNfts()).rejects.toThrow()
  })
})
