import {
  avatarInputSchema,
  changePasswordInputSchema,
  updateProfileInputSchema,
  userSchema,
} from '@/domain/auth'
import { commit, getDb, hashPassword } from '../db'
import { body, Failure, json, route, userId } from './util'

export const profileHandlers = [
  route('get', '/profile', async ({ request }) => {
    const db = await getDb()
    return json(
      userSchema.parse(db.users.find((u) => u.id === userId(request, db))),
    )
  }),
  route('patch', '/profile', async ({ request }) => {
    const input = await body(request, updateProfileInputSchema)
    return json(
      await commit((db) => {
        const id = userId(request, db)
        const user = db.users.find((u) => u.id === id)!
        if (
          input.version !== user.version ||
          db.users.some(
            (u) =>
              u.id !== id &&
              (u.username === input.username ||
                u.email.toLowerCase() === input.email.toLowerCase()),
          )
        )
          throw new Failure(409, 'CONFLICT')
        Object.assign(user, input, { version: user.version + 1 })
        return userSchema.parse(user)
      }),
    )
  }),
  ...(['put', 'delete'] as const).map((method) =>
    route(method, '/profile/avatar', async ({ request }) => {
      const input =
        method === 'put' ? await body(request, avatarInputSchema) : undefined
      return json(
        await commit((db) => {
          const user = db.users.find((u) => u.id === userId(request, db))!
          if (input) user.avatarUrl = input.dataUrl
          else delete user.avatarUrl
          user.version++
          return userSchema.parse(user)
        }),
      )
    }),
  ),
  route('post', '/profile/password', async ({ request }) => {
    const input = await body(request, changePasswordInputSchema)
    const db = await getDb()
    const id = userId(request, db)
    const user = db.users.find((u) => u.id === id)!
    const current = await hashPassword(input.currentPassword, user.salt)
    const passwordHash = await hashPassword(input.newPassword, user.salt)
    await commit((db) => {
      const user = db.users.find((u) => u.id === id)!
      if (current !== user.passwordHash)
        throw new Failure(422, 'VALIDATION_ERROR', 'Senha atual incorreta', {
          currentPassword: ['Senha incorreta'],
        })
      user.passwordHash = passwordHash
      user.version++
    })
    return new Response(null, { status: 204 })
  }),
]
