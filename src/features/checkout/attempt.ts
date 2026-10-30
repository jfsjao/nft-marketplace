import { z } from 'zod'
import { createOrderInputSchema } from '@/domain/order'

const attemptSchema = z.object({
  userId: z.string(),
  key: z.string().min(1),
  body: createOrderInputSchema,
  orderId: z.string().optional(),
})
export type Attempt = z.infer<typeof attemptSchema>
const storageKey = (userId: string) => `kurio:checkout:${userId}`

export function readAttempt(userId: string) {
  try {
    const attempt = attemptSchema.parse(
      JSON.parse(localStorage.getItem(storageKey(userId)) ?? 'null'),
    )
    return attempt.userId === userId ? attempt : null
  } catch {
    return null
  }
}
export function saveAttempt(attempt: Attempt) {
  localStorage.setItem(storageKey(attempt.userId), JSON.stringify(attempt))
}
export function clearAttempt(userId: string, key: string) {
  if (readAttempt(userId)?.key === key)
    localStorage.removeItem(storageKey(userId))
}
