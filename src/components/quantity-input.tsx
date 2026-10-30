import { useId } from 'react'
import type { CartItem } from '@/domain/cart'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function QuantityInput({
  value,
  max,
  onChange,
  disabled = false,
  label = 'Quantidade',
}: {
  value: CartItem['quantity']
  max: CartItem['availableQuantity']
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
}) {
  const id = useId()
  const change = (next: number) => {
    if (Number.isInteger(next) && next >= 1 && next <= max && next !== value)
      onChange(next)
  }
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <Button
        aria-label={`Diminuir ${label.toLowerCase()}`}
        disabled={disabled || value <= 1}
        onClick={() => change(value - 1)}
      >
        −
      </Button>
      <Input
        id={id}
        type="number"
        min={1}
        max={max}
        value={value}
        disabled={disabled || max < 1}
        onChange={(event) => change(event.target.valueAsNumber)}
      />
      <Button
        aria-label={`Aumentar ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => change(value + 1)}
      >
        +
      </Button>
    </div>
  )
}
