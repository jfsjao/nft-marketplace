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
    <div className="flex flex-wrap items-center gap-2">
      <label className="mr-2 text-sm text-text-secondary" htmlFor={id}>
        {label}
      </label>
      <Button
        className="size-9 rounded-full p-0 text-xl"
        aria-label={`Diminuir ${label.toLowerCase()}`}
        disabled={disabled || value <= 1}
        onClick={() => change(value - 1)}
      >
        −
      </Button>
      <Input
        className="h-9 w-14 border-0 bg-transparent px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        id={id}
        type="number"
        min={1}
        max={max}
        value={value}
        disabled={disabled || max < 1}
        onChange={(event) => change(event.target.valueAsNumber)}
      />
      <Button
        className="size-9 rounded-full p-0 text-xl"
        aria-label={`Aumentar ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => change(value + 1)}
      >
        +
      </Button>
    </div>
  )
}
