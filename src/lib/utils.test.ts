import { describe, expect, it } from 'vitest'
import { cn } from './utils'
describe('cn', () => {
  it('combina condições e resolve conflitos Tailwind', () => {
    expect(
      cn('px-2 text-sm', undefined, null, false, { block: true }, ['px-4']),
    ).toBe('text-sm block px-4')
  })
})
