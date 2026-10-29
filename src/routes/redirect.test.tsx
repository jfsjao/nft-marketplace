import { describe, expect, it } from 'vitest'
import { loginSearchSchema, validateRedirect } from './redirect'

describe('redirect interno', () => {
  it.each([
    '/',
    '/checkout',
    '/orders/order-1?from=checkout#receipt',
    '/?q=arte',
  ])('aceita %s', (path) => {
    expect(validateRedirect(path)).toBe(path)
    expect(loginSearchSchema.parse({ redirect: path }).redirect).toBe(path)
  })

  it.each([
    undefined,
    null,
    1,
    '',
    'checkout',
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/%2fexample.com',
    '/%252fexample.com',
    '/%5cexample.com',
    '/\n/evil',
    '/%0aevil',
    '/bad%escape',
  ])('rejeita %s', (path) => {
    expect(validateRedirect(path)).toBeUndefined()
    expect(loginSearchSchema.parse({ redirect: path }).redirect).toBeUndefined()
  })
})
