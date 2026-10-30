import { z } from 'zod'

export function validateRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  let decoded = value
  // Rejeita também separadores codificados e barras invertidas normalizadas pelo navegador.
  for (let attempt = 0; attempt <= value.length; attempt++) {
    if (
      !decoded.startsWith('/') ||
      /\/\/|\\/.test(decoded) ||
      Array.from(decoded).some(
        (character) =>
          character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      )
    ) {
      return undefined
    }
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return value
      decoded = next
    } catch {
      return undefined
    }
  }
  return undefined
}

export const loginSearchSchema = z.object({
  redirect: z.unknown().optional().transform(validateRedirect),
})
