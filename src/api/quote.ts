import { api } from './client'
import { quoteInputSchema, quoteSchema, type QuoteInput } from '@/domain/quote'

export async function createQuote(input: QuoteInput, signal?: AbortSignal) {
  return quoteSchema.parse(
    (await api.post('/quote', quoteInputSchema.parse(input), { signal })).data,
  )
}
