import { z } from 'zod'
import { quoteSchema } from './quote'

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR', // 400/422: campos inválidos, ver fieldErrors
  'UNAUTHORIZED', // 401: sessão ausente, inválida ou expirada
  'FORBIDDEN', // 403: recurso de outro usuário
  'NOT_FOUND', // 404
  'CONFLICT', // 409: e-mail/usuário já cadastrado, carteira duplicada
  'IDEMPOTENCY_CONFLICT', // 409: mesma chave com conteúdo diferente
  'OUT_OF_STOCK', // 409: edição esgotada ou acima do disponível
  'QUOTE_STALE', // 409: preço, estoque ou cupom mudou; traz a nova cotação
  'COUPON_INVALID', // 422
  'COUPON_EXPIRED', // 422
  'PAYMENT_DECLINED', // 402
  'SERVICE_UNAVAILABLE', // 503: falha transitória, pode tentar de novo
])

// Envelope único de erro: a UI trata pelo `code`, nunca pelo texto.
export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  requestId: z.string(),
  quote: quoteSchema.optional(),
})

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
