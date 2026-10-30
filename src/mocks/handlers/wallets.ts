import { walletInputSchema, walletSchema } from '@/domain/wallet'
import { commit, getDb } from '../db'
import { getScenario } from '../scenario'
import { body, Failure, json, route, userId } from './util'

export const walletHandlers = [
  route('get', '/wallets', async ({ request }) => {
    const db = await getDb()
    const id = userId(request, db)
    return json(
      db.wallets
        .filter((w) => w.userId === id)
        .map((w) => walletSchema.parse(w)),
    )
  }),
  route('post', '/wallets/:id/connect', async ({ request, params }) => {
    const db = await getDb()
    const id = userId(request, db)
    const wallet = db.wallets.find(
      (wallet) => wallet.id === params.id && wallet.userId === id,
    )
    if (!wallet) throw new Failure(404, 'NOT_FOUND')
    if (getScenario().walletOutcome === 'reject')
      throw new Failure(409, 'CONFLICT', 'Conexão recusada na carteira')
    return json(walletSchema.parse(wallet))
  }),
  route('put', '/wallets/:slot', async ({ request, params }) => {
    const input = await body(request, walletInputSchema)
    if (input.slot !== params.slot)
      throw new Failure(422, 'VALIDATION_ERROR', 'Slot incompatível', {
        slot: ['Use o mesmo slot da URL'],
      })
    return json(
      await commit((db) => {
        const id = userId(request, db)
        const existing = db.wallets.find(
          (w) => w.userId === id && w.slot === input.slot,
        )
        const normalize = (address: string, network: string) =>
          network === 'solana' ? address : address.toLowerCase()
        if (
          db.wallets.some(
            (w) =>
              w.userId === id &&
              w.id !== existing?.id &&
              w.network === input.network &&
              normalize(w.address, w.network) ===
                normalize(input.address, input.network),
          )
        )
          throw new Failure(409, 'CONFLICT')
        const wallet = {
          ...input,
          id: existing?.id ?? `wallet-${++db.counters.id + 2}`,
          userId: id,
          version: (existing?.version ?? 0) + 1,
        }
        if (existing) Object.assign(existing, wallet)
        else db.wallets.push(wallet)
        return walletSchema.parse(wallet)
      }),
    )
  }),
]
