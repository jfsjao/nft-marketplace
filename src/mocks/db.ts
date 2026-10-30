import type { User } from '@/domain/auth'
import {
  cartSchema,
  type AddCartItemInput,
  type Cart,
  type CartAdjustment,
} from '@/domain/cart'
import type { Edition } from '@/domain/nft'
import type { Order } from '@/domain/order'
import type { Quote } from '@/domain/quote'
import { addEth, multiplyEth } from '@/lib/eth'
import { getScenario, type Scenario } from './scenario'
import {
  networkFees,
  seedCoupons,
  seedNfts,
  seedUsers,
  seedWallets,
} from './seed'

export interface MockDb {
  version: 1
  users: (User & { passwordHash: string; salt: string })[]
  sessions: { token: string; userId: string; expiresAt: string }[]
  nfts: ReturnType<typeof seedNfts>
  favorites: Record<string, string[]>
  carts: Record<
    string,
    {
      items: AddCartItemInput[]
      revision: number
      adjustments: CartAdjustment[]
    }
  >
  quotes: (Quote & { userId: string })[]
  orders: (Order & {
    settleAt?: string
    orderOutcome?: Scenario['orderOutcome']
  })[]
  idempotency: {
    userId: string
    key: string
    payloadHash: string
    orderId: string
  }[]
  wallets: ReturnType<typeof seedWallets>
  coupons: typeof seedCoupons
  networkFees: typeof networkFees
  counters: { id: number; event: number }
}

export const DB_KEY = 'kurio:mock-db:v1'
let state: MockDb | undefined
let initialization: Promise<MockDb> | undefined

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${password}`),
  )
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function createSeed(): Promise<MockDb> {
  const users = await Promise.all(
    seedUsers.map(async (user) => {
      const salt = `kurio:seed:v1:${user.id}`
      return {
        ...user,
        salt,
        passwordHash: await hashPassword('kurio123', salt),
      }
    }),
  )
  return {
    version: 1,
    users,
    sessions: [],
    nfts: seedNfts(),
    favorites: {},
    carts: {},
    quotes: [],
    orders: [],
    idempotency: [],
    wallets: seedWallets(),
    coupons: structuredClone(seedCoupons),
    networkFees: { ...networkFees },
    counters: { id: 0, event: 0 },
  }
}

function persist(db: MockDb) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* Node ou quota excedida: mantém em memória. */
  }
}

export async function getDb(): Promise<MockDb> {
  if (state) return state
  initialization ??= (async () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(DB_KEY) ?? 'null',
      ) as MockDb | null
      if (
        saved?.version === 1 &&
        Array.isArray(saved.users) &&
        saved.users.every(
          (user) =>
            typeof user.passwordHash === 'string' &&
            typeof user.salt === 'string' &&
            !('password' in user),
        ) &&
        Array.isArray(saved.nfts) &&
        saved.carts &&
        saved.counters
      ) {
        for (const cart of Object.values(saved.carts)) cart.adjustments ??= []
        return saved
      }
    } catch {
      /* Banco ausente ou inválido: restaura o seed. */
    }
    return createSeed()
  })()
  state = await initialization
  return state
}

export async function resetDb(): Promise<MockDb> {
  await initialization
  state = await createSeed()
  initialization = undefined
  persist(state)
  return state
}

// Mutação síncrona sobre cópia: uma exceção não deixa alterações parciais.
export async function commit<T>(mutator: (db: MockDb) => T): Promise<T> {
  await getDb()
  const draft = structuredClone(state!)
  const result = mutator(draft)
  if (result instanceof Promise)
    throw new Error('commit exige mutação síncrona')
  state = draft
  persist(draft)
  return result
}

export function now(): number {
  return Date.now() + getScenario().clockOffsetMs
}

function currentDb(): MockDb {
  if (!state) throw new Error('Inicialize o banco com await getDb()')
  return state
}

// O snapshot opcional permite usar os helpers dentro de commit sem efeitos colaterais.
export function findNft(id: string, db = currentDb()) {
  return db.nfts.find((nft) => nft.id === id)
}

export function availableFor(edition: Edition): number {
  // Reservas já são subtraídas de availableQuantity pelo handler de pedidos.
  return edition.availableQuantity
}

export function cartView(ownerId: string, db = currentDb()): Cart {
  const cart = db.carts[ownerId]
  const items = (cart?.items ?? []).map((item) => {
    const nft = findNft(item.nftId, db)
    const edition = nft?.editions.find((entry) => entry.id === item.editionId)
    if (!nft || !edition)
      throw new Error('Item do carrinho aponta para edição inexistente')
    return {
      ...item,
      name: nft.name,
      tokenId: nft.tokenId,
      imageUrl: nft.imageUrl,
      editionLabel: edition.label,
      unitPriceEth: edition.priceEth,
      availableQuantity: availableFor(edition),
      lineTotalEth: multiplyEth(edition.priceEth, item.quantity),
      editionVersion: edition.version,
    }
  })
  return cartSchema.parse({
    ownerId,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotalEth: addEth(...items.map((item) => item.lineTotalEth)),
    revision: cart?.revision ?? 0,
    adjustments: cart?.adjustments ?? [],
  })
}
