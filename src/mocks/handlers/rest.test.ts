// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '../handlers'
import { getDb, resetDb } from '../db'
import { setScenario } from '../scenario'
import { changeEdition } from '../actions'
import { apiErrorSchema } from '@/domain/errors'
import { orderSchema } from '@/domain/order'
import { quoteSchema } from '@/domain/quote'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(async () => {
  setScenario({
    latency: 'none',
    failures: [],
    clockOffsetMs: 0,
    sessionTtlMs: 3600000,
    event: undefined,
    orderOutcome: undefined,
  })
  await resetDb()
})
async function call(
  path: string,
  method = 'GET',
  data?: unknown,
  token?: string,
  headers: Record<string, string> = {},
) {
  const response = await fetch(`http://localhost/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  const value = response.status === 204 ? undefined : await response.json()
  if (!response.ok) apiErrorSchema.parse(value)
  return { status: response.status, data: value }
}
async function login(second = false) {
  return (
    await call('/auth/login', 'POST', {
      email: second ? 'segundo@kurio.dev' : 'colecionador@kurio.dev',
      password: 'kurio123',
    })
  ).data.token as string
}
const item = { nftId: 'nft-2', editionId: 'nft-2-edition-2', quantity: 2 }
async function checkout(token: string) {
  await call('/cart/items', 'POST', item, token)
  const quote = (await call('/quote', 'POST', {}, token)).data
  quoteSchema.parse(quote)
  return {
    quoteId: quote.id,
    walletId: 'wallet-1',
    network: 'ethereum',
    provider: 'metamask',
    collector: {
      displayName: 'Teste',
      username: 'teste',
      profileName: 'teste',
      email: 'teste@example.com',
      referralCode: 'KURIO',
      ensName: 'teste.eth',
    },
  }
}
describe('REST com banco persistente', () => {
  it('login, senha incorreta, sessão expirada e cadastro conflitante', async () => {
    const token = await login()
    expect(
      (await call('/auth/session', 'GET', undefined, token)).data.user.id,
    ).toBe('user-1')
    expect(
      (
        await call('/auth/login', 'POST', {
          email: 'colecionador@kurio.dev',
          password: 'errada',
        })
      ).status,
    ).toBe(401)
    expect(
      (
        await call('/auth/register', 'POST', {
          username: 'novo',
          email: 'colecionador@kurio.dev',
          password: 'kurio123',
          confirmPassword: 'kurio123',
        })
      ).status,
    ).toBe(409)
    setScenario({ clockOffsetMs: 3600001 })
    expect((await call('/profile', 'GET', undefined, token)).status).toBe(401)
  })
  it('valida campos e JSON', async () => {
    const result = await call('/auth/login', 'POST', {
      email: 'x',
      password: '',
    })
    expect(result.status).toBe(422)
    expect(result.data.fieldErrors.email).toBeDefined()
  })
  it('combina filtros, paginação, preço e facetas', async () => {
    const result = (
      await call(
        '/nfts?collections=digital-art&networks=ethereum&pageSize=2&sort=price-asc&minPriceEth=0.1',
      )
    ).data
    expect(result.total).toBe(4)
    expect(result.items).toHaveLength(2)
    expect(result.facets.collections).toEqual([
      { value: 'digital-art', count: 4 },
    ])
    const page = (
      await call(
        '/nfts?collections=digital-art&networks=ethereum&pageSize=2&page=2&sort=price-asc&minPriceEth=0.1',
      )
    ).data
    expect(page.items.map((n: { id: string }) => n.id)).not.toContain(
      result.items[0].id,
    )
    expect((await call('/nfts?search=Emerald')).data.total).toBe(1)
    expect((await call('/nfts?pageSize=100')).status).toBe(422)
  })
  it('carrinho isolado e merge limitado sem duplicação', async () => {
    const token = await login()
    await call('/cart/items', 'POST', { ...item, quantity: 7 }, undefined, {
      'X-Guest-Id': 'visitante',
    })
    await call('/cart/items', 'POST', { ...item, quantity: 6 }, token)
    const merged = await call(
      '/cart/merge',
      'POST',
      { guestId: 'visitante' },
      token,
    )
    expect(merged.data.items[0].quantity).toBe(10)
    expect(merged.data.adjustments[0].reason).toBe('quantity-reduced')
    expect(
      (await call('/cart/merge', 'POST', { guestId: 'visitante' }, token)).data
        .itemCount,
    ).toBe(10)
    expect(
      (
        await call('/cart', 'GET', undefined, undefined, {
          'X-Guest-Id': 'visitante',
        })
      ).data.items,
    ).toEqual([])
    expect(
      (await call('/cart', 'GET', undefined, await login(true))).data.items,
    ).toEqual([])
    expect((await call('/cart/items', 'POST', item, token)).status).toBe(409)
  })
  it('cupons inválido, expirado e desconto exato', async () => {
    const token = await login()
    await call('/cart/items', 'POST', item, token)
    expect(
      (await call('/quote', 'POST', { couponCode: 'outro' }, token)).data.code,
    ).toBe('COUPON_INVALID')
    expect(
      (await call('/quote', 'POST', { couponCode: 'EXPIRADO' }, token)).data
        .code,
    ).toBe('COUPON_EXPIRED')
    const quote = (
      await call('/quote', 'POST', { couponCode: 'kurio10' }, token)
    ).data
    expect(quote.discountEth).toBe('0.338')
    expect(quote.totalEth).toBe('3.058')
  })
  it('reserva uma vez, replay antes de validar, conflito e liquidação preservando adições', async () => {
    const token = await login()
    const input = await checkout(token)
    const headers = { 'Idempotency-Key': 'compra' }
    expect((await call('/orders', 'POST', input, token)).status).toBe(400)
    const created = await call('/orders', 'POST', input, token, headers)
    expect(created.status).toBe(201)
    orderSchema.parse(created.data)
    const replay = await call('/orders', 'POST', input, token, headers)
    expect(replay.status).toBe(200)
    expect(replay.data).toEqual(created.data)
    expect(
      (
        await call(
          '/orders',
          'POST',
          { ...input, quoteId: 'outro' },
          token,
          headers,
        )
      ).data.code,
    ).toBe('IDEMPOTENCY_CONFLICT')
    await call('/cart/items', 'POST', { ...item, quantity: 1 }, token)
    setScenario({ clockOffsetMs: 2000 })
    const settled = (
      await call(`/orders/${created.data.id}`, 'GET', undefined, token)
    ).data
    expect(settled.status).toBe('confirmed')
    expect(settled.transactionHash).toMatch(/^0x/)
    expect((await call('/cart', 'GET', undefined, token)).data.itemCount).toBe(
      1,
    )
    expect((await getDb()).nfts[1].editions[1].availableQuantity).toBe(8)
    expect(
      (
        await call(
          `/orders/${created.data.id}`,
          'GET',
          undefined,
          await login(true),
        )
      ).status,
    ).toBe(403)
  })
  it('cotação stale traz snapshot novo e não cria pedido', async () => {
    const token = await login()
    const input = await checkout(token)
    await changeEdition(item.nftId, item.editionId, { priceEth: '2' })
    const result = await call('/orders', 'POST', input, token, {
      'Idempotency-Key': 'stale',
    })
    expect(result.data.code).toBe('QUOTE_STALE')
    quoteSchema.parse(result.data.quote)
    expect(result.data.quote.lines[0].unitPriceEth).toBe('2')
    expect((await getDb()).orders).toHaveLength(0)
  })
  it('timeout persiste e replay recupera; recusa libera reserva', async () => {
    const token = await login()
    const input = await checkout(token)
    setScenario('order-timeout')
    setScenario({ latency: 'none' })
    await expect(
      call('/orders', 'POST', input, token, { 'Idempotency-Key': 'timeout' }),
    ).rejects.toThrow()
    const replay = await call('/orders', 'POST', input, token, {
      'Idempotency-Key': 'timeout',
    })
    expect(replay.status).toBe(200)
    setScenario({ orderOutcome: 'declined', clockOffsetMs: 2000 })
    expect(
      (await call(`/orders/${replay.data.id}`, 'GET', undefined, token)).data
        .status,
    ).toBe('declined')
    expect((await getDb()).nfts[1].editions[1].availableQuantity).toBe(10)
    expect((await call('/cart', 'GET', undefined, token)).data.itemCount).toBe(
      2,
    )
  })
  it('isola favoritos, perfil, carteiras e cotação', async () => {
    const one = await login(),
      two = await login(true)
    await call('/favorites/nft-1', 'PUT', undefined, one)
    expect(
      (await call('/favorites', 'GET', undefined, two)).data.nftIds,
    ).toEqual([])
    expect((await call('/wallets', 'GET', undefined, two)).data[0].id).toBe(
      'wallet-2',
    )
    const profile = (await call('/profile', 'GET', undefined, one)).data
    expect(
      (
        await call(
          '/profile',
          'PATCH',
          { ...profile, username: 'segundo' },
          one,
        )
      ).status,
    ).toBe(409)
    const input = await checkout(one)
    expect(
      (
        await call('/orders', 'POST', input, two, {
          'Idempotency-Key': 'roubo',
        })
      ).status,
    ).toBe(403)
  })
})

it('eventos de cenário alteram a primeira linha após dois segundos', async () => {
  const token = await login()
  setScenario({ event: 'price-change' })
  const input = await checkout(token)
  await new Promise((resolve) => setTimeout(resolve, 2100))
  expect((await getDb()).nfts[1].editions[1].priceEth).toBe('1.79')
  expect(
    (
      await call('/orders', 'POST', input, token, {
        'Idempotency-Key': 'changed',
      })
    ).data.code,
  ).toBe('QUOTE_STALE')
})

it('cotação vencida ou estoque zerado exige novo aceite', async () => {
  const token = await login()
  const input = await checkout(token)
  setScenario({ clockOffsetMs: 31000 })
  const expired = await call('/orders', 'POST', input, token, {
    'Idempotency-Key': 'expired',
  })
  expect(expired.data.code).toBe('QUOTE_STALE')
  await changeEdition(item.nftId, item.editionId, { availableQuantity: 0 })
  const stale = await call(
    '/orders',
    'POST',
    { ...input, quoteId: expired.data.quote.id },
    token,
    { 'Idempotency-Key': 'sold' },
  )
  expect(stale.data.code).toBe('QUOTE_STALE')
  expect(stale.data.quote.lines).toEqual([])
  expect((await getDb()).orders).toHaveLength(0)
})

it('perfil, avatar, senha e carteiras mantêm versão e privacidade', async () => {
  const token = await login()
  const profile = (await call('/profile', 'GET', undefined, token)).data
  const updated = await call(
    '/profile',
    'PATCH',
    { ...profile, displayName: 'Novo nome' },
    token,
  )
  expect(updated.data.version).toBe(profile.version + 1)
  expect(updated.data.passwordHash).toBeUndefined()
  const avatar = await call(
    '/profile/avatar',
    'PUT',
    { dataUrl: 'data:image/png;base64,YQ==' },
    token,
  )
  expect(avatar.data.avatarUrl).toBeDefined()
  expect(
    (await call('/profile/avatar', 'DELETE', undefined, token)).data.avatarUrl,
  ).toBeUndefined()
  expect(
    (
      await call(
        '/profile/password',
        'POST',
        {
          currentPassword: 'errada',
          newPassword: 'novasenha',
          confirmPassword: 'novasenha',
        },
        token,
      )
    ).status,
  ).toBe(422)
  expect(
    (
      await call(
        '/profile/password',
        'POST',
        {
          currentPassword: 'kurio123',
          newPassword: 'novasenha',
          confirmPassword: 'novasenha',
        },
        token,
      )
    ).status,
  ).toBe(204)
  expect(
    (
      await call('/auth/login', 'POST', {
        email: profile.email,
        password: 'novasenha',
      })
    ).status,
  ).toBe(200)
  const wallet = (await call('/wallets', 'GET', undefined, token)).data[0]
  expect(
    (
      await call(
        '/wallets/secondary',
        'PUT',
        { ...wallet, slot: 'secondary' },
        token,
      )
    ).status,
  ).toBe(409)
  const secondary = await call(
    '/wallets/secondary',
    'PUT',
    { ...wallet, slot: 'secondary', address: `0x${'3'.repeat(40)}` },
    token,
  )
  expect(secondary.status).toBe(200)
  expect(secondary.data.userId).toBeUndefined()
  expect(
    (await call('/wallets', 'GET', undefined, await login(true))).data,
  ).toHaveLength(1)
})
