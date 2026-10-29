import {
  loginInputSchema,
  registerInputSchema,
  userSchema,
} from '@/domain/auth'
import { commit, getDb, hashPassword, now, type MockDb } from '../db'
import { getScenario } from '../scenario'
import { body, Failure, json, route, userId } from './util'

function session(db: MockDb, id: string) {
  const entry = {
    userId: id,
    token: crypto.randomUUID(),
    expiresAt: new Date(now() + getScenario().sessionTtlMs).toISOString(),
  }
  db.sessions.push(entry)
  return {
    token: entry.token,
    expiresAt: entry.expiresAt,
    user: userSchema.parse(db.users.find((u) => u.id === id)),
  }
}
export const authHandlers = [
  route('post', '/auth/login', async ({ request }) => {
    const input = await body(request, loginInputSchema)
    const user = (await getDb()).users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase(),
    )
    if (
      !user ||
      (await hashPassword(input.password, user.salt)) !== user.passwordHash
    )
      throw new Failure(401, 'UNAUTHORIZED')
    return json(await commit((db) => session(db, user.id)))
  }),
  route('post', '/auth/register', async ({ request }) => {
    const input = await body(request, registerInputSchema)
    const salt = crypto.randomUUID()
    const passwordHash = await hashPassword(input.password, salt)
    return json(
      await commit((db) => {
        if (
          db.users.some(
            (u) =>
              u.email.toLowerCase() === input.email.toLowerCase() ||
              u.username === input.username,
          )
        )
          throw new Failure(409, 'CONFLICT')
        const id = `user-${++db.counters.id + 2}`
        db.users.push({
          id,
          username: input.username,
          displayName: input.username,
          email: input.email,
          version: 1,
          salt,
          passwordHash,
        })
        return session(db, id)
      }),
      { status: 201 },
    )
  }),
  route('get', '/auth/session', async ({ request }) => {
    const db = await getDb()
    const id = userId(request, db)
    const entry = db.sessions.find(
      (s) => s.token === request.headers.get('Authorization')!.slice(7),
    )!
    return json({
      token: entry.token,
      expiresAt: entry.expiresAt,
      user: userSchema.parse(db.users.find((u) => u.id === id)),
    })
  }),
  route('post', '/auth/logout', async ({ request }) => {
    await commit((db) => {
      userId(request, db)
      db.sessions = db.sessions.filter(
        (s) => s.token !== request.headers.get('Authorization')!.slice(7),
      )
    })
    return new Response(null, { status: 204 })
  }),
]
