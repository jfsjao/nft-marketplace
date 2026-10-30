// Cupom aceito no carrinho, lembrado por dono para o checkout pedir a mesma cotação.
const key = (ownerId: string) => `kurio:coupon:${ownerId}`

export function getCoupon(ownerId: string) {
  try {
    return localStorage.getItem(key(ownerId)) ?? undefined
  } catch {
    return undefined
  }
}

export function setCoupon(ownerId: string, code?: string) {
  try {
    if (code) localStorage.setItem(key(ownerId), code)
    else localStorage.removeItem(key(ownerId))
  } catch {
    /* Sem armazenamento: o cupom vale só nesta tela. */
  }
}
