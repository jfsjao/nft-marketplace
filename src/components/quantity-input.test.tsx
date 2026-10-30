import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QuantityInput } from './quantity-input'

it('respeita os limites no campo e nos botões', () => {
  const onChange = vi.fn()
  const { rerender, unmount } = render(
    <QuantityInput value={1} max={3} onChange={onChange} />,
  )
  expect(
    screen.getByRole('button', { name: 'Diminuir quantidade' }),
  ).toBeDisabled()
  const input = screen.getByLabelText('Quantidade')
  for (const value of ['0', '4', '1.5', ''])
    fireEvent.change(input, { target: { value } })
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
  expect(onChange).toHaveBeenLastCalledWith(2)
  rerender(<QuantityInput value={3} max={3} onChange={onChange} />)
  expect(
    screen.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Diminuir quantidade' }))
  expect(onChange).toHaveBeenLastCalledWith(2)
  rerender(<QuantityInput value={0} max={0} onChange={onChange} />)
  expect(input).toBeDisabled()
  expect(
    screen
      .getAllByRole('button')
      .every((button) => button.hasAttribute('disabled')),
  ).toBe(true)
  unmount()
})
