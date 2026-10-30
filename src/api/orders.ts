import { api } from './client'
import {
  createOrderInputSchema,
  orderSchema,
  type CreateOrderInput,
} from '@/domain/order'

export async function createOrder(
  body: CreateOrderInput,
  key: string,
  signal?: AbortSignal,
) {
  return orderSchema.parse(
    (
      await api.post('/orders', createOrderInputSchema.parse(body), {
        headers: { 'Idempotency-Key': key },
        signal,
      })
    ).data,
  )
}

export async function getOrder(id: string, signal?: AbortSignal) {
  return orderSchema.parse(
    (await api.get(`/orders/${encodeURIComponent(id)}`, { signal })).data,
  )
}
