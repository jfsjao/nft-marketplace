import { z } from 'zod'
import { isoDateSchema, versionSchema } from './common'

const passwordSchema = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres')
  .max(72, 'Use no máximo 72 caracteres')

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_.]{3,24}$/, 'Use 3 a 24 letras minúsculas, números, _ ou .')

// Campos da tela Perfil do colecionador.
export const userSchema = z.object({
  id: z.string().min(1),
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(40),
  email: z.email(),
  ensName: z.string().trim().max(40).optional(),
  walletNickname: z.string().trim().max(40).optional(),
  avatarUrl: z.string().optional(),
  version: versionSchema,
})

// Token opaco simulado; a sessão vence em `expiresAt` e a API responde 401.
export const sessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateSchema,
  user: userSchema,
})

export const loginInputSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

// Modal Criar conta: usuário, e-mail, senha e confirmação.
export const registerInputSchema = z
  .object({
    username: usernameSchema,
    email: z.email('E-mail inválido'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

export const updateProfileInputSchema = userSchema
  .pick({
    username: true,
    displayName: true,
    email: true,
    ensName: true,
    walletNickname: true,
  })
  .extend({ version: versionSchema })

// Upload simulado: PNG, JPEG ou WebP de até 1 MiB, enviado como data URL.
export const avatarInputSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Use PNG, JPEG ou WebP')
    .max(1_400_000, 'A imagem deve ter até 1 MiB'),
})

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })

export type User = z.infer<typeof userSchema>
export type Session = z.infer<typeof sessionSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>
export type AvatarInput = z.infer<typeof avatarInputSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>
