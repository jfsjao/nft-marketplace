import { describe, expect, it } from 'vitest'
import {
  ETH_DECIMAL_REGEX,
  addEth,
  applyPercentDiscount,
  formatEth,
  fromWei,
  multiplyEth,
  toWei,
} from '@/lib/eth'

describe('precisão de ETH em wei', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
    expect(addEth()).toBe('0')
  })

  it('preserva até 18 casas e valores grandes', () => {
    expect(toWei('0.000000000000000001')).toBe(1n)
    expect(toWei('1.123456789012345678')).toBe(1123456789012345678n)
    const large = '123456789012345678901234567890.123456789012345678'
    expect(fromWei(toWei(large))).toBe(large)
    expect(addEth(large, '0.000000000000000001')).toBe(
      '123456789012345678901234567890.123456789012345679',
    )
  })

  it('converte wei sem zeros finais nem notação científica', () => {
    expect(fromWei(0n)).toBe('0')
    expect(fromWei(500000000000000000n)).toBe('0.5')
    expect(fromWei(10n ** 40n)).toBe('10000000000000000000000')
    expect(fromWei(-1n)).toBe('-0.000000000000000001')
    expect(toWei('0001.00')).toBe(10n ** 18n)
  })

  it.each(['1.', '.5', '-1', '1e3', '1.0000000000000000001', '', ' 1', '1\n'])(
    'rejeita formato inválido %j',
    (value) => {
      expect(() => toWei(value)).toThrow()
    },
  )

  it('exporta a expressão decimal esperada', () => {
    expect(ETH_DECIMAL_REGEX.source).toBe('^\\d+(\\.\\d{1,18})?$')
  })

  it('multiplica por quantidade inteira inclusive zero', () => {
    expect(multiplyEth('0.1', 3)).toBe('0.3')
    expect(multiplyEth('0.000000000000000001', 2)).toBe('0.000000000000000002')
    expect(multiplyEth('123', 0)).toBe('0')
  })

  it.each([1.5, -1, NaN, Infinity])('rejeita quantidade %s', (quantity) => {
    expect(() => multiplyEth('1', quantity)).toThrow()
  })

  it('arredonda o desconto para baixo em wei e conserva o total', () => {
    expect(applyPercentDiscount('0.000000000000000003', 50)).toEqual({
      discountEth: '0.000000000000000001',
      totalEth: '0.000000000000000002',
    })
    expect(applyPercentDiscount('10', 25)).toEqual({
      discountEth: '2.5',
      totalEth: '7.5',
    })
    expect(applyPercentDiscount('1', 0)).toEqual({
      discountEth: '0',
      totalEth: '1',
    })
    expect(applyPercentDiscount('1', 100)).toEqual({
      discountEth: '1',
      totalEth: '0',
    })
  })

  it.each([-1, 101, 1.5, NaN, Infinity])('rejeita percentual %s', (percent) => {
    expect(() => applyPercentDiscount('1', percent)).toThrow()
  })

  it('formata com o mínimo de casas sem perder precisão', () => {
    expect(formatEth('26.846')).toBe('26.846')
    expect(formatEth('0.5')).toBe('0.50')
    expect(formatEth('0')).toBe('0.00')
    expect(formatEth('1', 0)).toBe('1')
    expect(formatEth('1.2', 4)).toBe('1.2000')
    expect(formatEth('0.123456789012345678')).toBe('0.123456789012345678')
  })

  it.each([-1, 19, 1.5, NaN, Infinity])(
    'rejeita mínimo de casas %s',
    (minimum) => {
      expect(() => formatEth('1', minimum)).toThrow()
    },
  )
})
