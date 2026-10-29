import { api } from './client'
import {
  loginInputSchema,
  registerInputSchema,
  sessionSchema,
  type LoginInput,
  type RegisterInput,
} from '@/domain/auth'
import { cartSchema, mergeCartInputSchema } from '@/domain/cart'

export async function login(input: LoginInput) {
  return sessionSchema.parse(
    (await api.post('/auth/login', loginInputSchema.parse(input))).data,
  )
}
export async function register(input: RegisterInput) {
  return sessionSchema.parse(
    (await api.post('/auth/register', registerInputSchema.parse(input))).data,
  )
}
export async function getSession() {
  return sessionSchema.parse((await api.get('/auth/session')).data)
}
export async function logout() {
  await api.post('/auth/logout')
}
export async function mergeCart(guestId: string) {
  return cartSchema.parse(
    (await api.post('/cart/merge', mergeCartInputSchema.parse({ guestId })))
      .data,
  )
}
