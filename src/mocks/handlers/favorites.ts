import { commit } from '../db'
import { Failure, json, route, userId } from './util'

export const favoriteHandlers = (['get', 'put', 'delete'] as const).map(
  (method) =>
    route(
      method,
      method === 'get' ? '/favorites' : '/favorites/:nftId',
      async ({ request, params }) =>
        json(
          await commit((db) => {
            const id = userId(request, db)
            const list = (db.favorites[id] ??= [])
            const nftId = String(params.nftId)
            if (method === 'put') {
              if (!db.nfts.some((n) => n.id === nftId))
                throw new Failure(404, 'NOT_FOUND')
              if (!list.includes(nftId)) list.push(nftId)
            }
            if (method === 'delete')
              db.favorites[id] = list.filter((n) => n !== nftId)
            return { nftIds: db.favorites[id] }
          }),
        ),
    ),
)
