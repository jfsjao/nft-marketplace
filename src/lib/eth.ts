export const ETH_DECIMAL_REGEX = /^\d+(\.\d{1,18})?$/

const WEI_PER_ETH = 10n ** 18n

export function toWei(eth: string): bigint {
  if (!ETH_DECIMAL_REGEX.test(eth)) {
    throw new Error('Formato de ETH inválido')
  }

  const [integer, fraction = ''] = eth.split('.')
  return BigInt(integer) * WEI_PER_ETH + BigInt(fraction.padEnd(18, '0'))
}

export function fromWei(wei: bigint): string {
  const sign = wei < 0n ? '-' : ''
  const absolute = wei < 0n ? -wei : wei
  const integer = absolute / WEI_PER_ETH
  const fraction = (absolute % WEI_PER_ETH)
    .toString()
    .padStart(18, '0')
    .replace(/0+$/, '')

  return `${sign}${integer}${fraction ? `.${fraction}` : ''}`
}

export function addEth(...values: string[]): string {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))
}

export function multiplyEth(eth: string, quantity: number): string {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('Quantidade deve ser um inteiro maior ou igual a zero')
  }

  return fromWei(toWei(eth) * BigInt(quantity))
}

export function applyPercentDiscount(
  eth: string,
  percent: number,
): { discountEth: string; totalEth: string } {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error('Percentual deve ser um inteiro entre 0 e 100')
  }

  const wei = toWei(eth)
  const discount = (wei * BigInt(percent)) / 100n
  return { discountEth: fromWei(discount), totalEth: fromWei(wei - discount) }
}

export function formatEth(eth: string, minDecimals = 2): string {
  if (!Number.isInteger(minDecimals) || minDecimals < 0 || minDecimals > 18) {
    throw new Error('Mínimo de casas decimais deve ser um inteiro entre 0 e 18')
  }

  const [integer, fraction = ''] = fromWei(toWei(eth)).split('.')
  const decimals = fraction.padEnd(minDecimals, '0')
  return decimals ? `${integer}.${decimals}` : integer
}
