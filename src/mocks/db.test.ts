// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { userSchema } from '@/domain/auth'
import { nftDetailSchema } from '@/domain/nft'
import { walletSchema } from '@/domain/wallet'
import {
  DB_KEY,
  availableFor,
  cartView,
  commit,
  findNft,
  getDb,
  hashPassword,
  now,
  resetDb,
} from './db'
import { getScenario, resetScenario, setScenario } from './scenario'

beforeEach(async () => {
  resetScenario()
  await resetDb()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetScenario()
})

describe('banco do mock', () => {
  it('valida seed determinístico, variedade e estoque nos contratos', async () => {
    const db = await getDb()
    expect(db.nfts).toHaveLength(30)
    db.nfts.forEach((nft) => nftDetailSchema.parse(nft))
    db.users.forEach((user) => userSchema.parse(user))
    db.wallets.forEach((wallet) => walletSchema.parse(wallet))
    expect(new Set(db.nfts.map((nft) => nft.collection)).size).toBe(9)
    expect(new Set(db.nfts.map((nft) => nft.network)).size).toBe(3)
    expect(
      db.nfts.some(
        (nft) =>
          nft.soldOut &&
          nft.editions.every((edition) => availableFor(edition) === 0),
      ),
    ).toBe(true)
    const seed = structuredClone(db)
    await commit((draft) => {
      draft.nfts[0].name = 'Alterado'
      draft.sessions.push({
        token: 'token',
        userId: 'user-1',
        expiresAt: '2030-01-01T00:00:00.000Z',
      })
    })
    expect(await resetDb()).toEqual(seed)
  })

  it('persiste e recarrega em outra instância do módulo sem senha em claro', async () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    })
    await resetDb()
    await commit((db) => {
      db.favorites['user-1'] = ['nft-1']
    })
    expect(storage.get(DB_KEY)).not.toContain('kurio123')
    vi.resetModules()
    const reloaded = await import('./db')
    expect((await reloaded.getDb()).favorites['user-1']).toEqual(['nft-1'])
    const db = await getDb()
    for (const user of db.users) {
      expect(user.passwordHash).toBe(await hashPassword('kurio123', user.salt))
      expect(user.passwordHash).toMatch(/^[a-f0-9]{64}$/)
    }
    expect(db.users[0].passwordHash).not.toBe(db.users[1].passwordHash)
  })

  it('monta carrinho isolado com subtotal exato sem alterar o banco', async () => {
    await commit((db) => {
      db.carts['guest:demo'] = {
        revision: 2,
        items: [
          { nftId: 'nft-1', editionId: 'nft-1-edition-1', quantity: 1 },
          { nftId: 'nft-2', editionId: 'nft-2-edition-2', quantity: 3 },
        ],
      }
    })
    expect(cartView('guest:demo')).toMatchObject({
      subtotalEth: '6.26',
      itemCount: 4,
      revision: 2,
    })
    expect(cartView('user-1').subtotalEth).toBe('0')
    expect(findNft('nft-1')?.priceEth).toBe('1.19')
    expect(findNft('inexistente')).toBeUndefined()
  })

  it('não publica mutação parcial e funciona com storage indisponível', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('Bloqueado')
      },
      setItem() {
        throw new Error('Quota')
      },
    })
    await expect(
      commit((db) => {
        db.nfts.length = 0
        throw new Error('Falhou')
      }),
    ).rejects.toThrow('Falhou')
    expect((await getDb()).nfts).toHaveLength(30)
    await resetDb()
    expect((await getDb()).users).toHaveLength(2)
  })

  it('controla relógio, presets e devolve cópias do cenário', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    setScenario({ clockOffsetMs: 500, latency: 'none' })
    expect(now()).toBe(1500)
    getScenario().failures.push({
      route: '*',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      times: 1,
    })
    expect(getScenario().failures).toEqual([])
    setScenario('session-expired')
    expect(getScenario().sessionTtlMs).toBe(0)
    resetScenario()
    expect(getScenario().clockOffsetMs).toBe(0)
  })
})
