import { api } from './client'
import {
  userSchema,
  updateProfileInputSchema,
  avatarInputSchema,
  changePasswordInputSchema,
  type UpdateProfileInput,
  type AvatarInput,
  type ChangePasswordInput,
} from '@/domain/auth'

export async function getProfile(signal?: AbortSignal) {
  return userSchema.parse((await api.get('/profile', { signal })).data)
}
export async function updateProfile(input: UpdateProfileInput) {
  return userSchema.parse(
    (await api.patch('/profile', updateProfileInputSchema.parse(input))).data,
  )
}
export async function alterAvatar(input?: AvatarInput) {
  return userSchema.parse(
    (input
      ? await api.put('/profile/avatar', avatarInputSchema.parse(input))
      : await api.delete('/profile/avatar')
    ).data,
  )
}
export async function changePassword(input: ChangePasswordInput) {
  await api.post('/profile/password', changePasswordInputSchema.parse(input))
}
