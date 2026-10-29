import * as React from 'react'
import { cn } from '@/lib/utils'
import * as Primitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      'peer size-4 shrink-0 rounded-sm border border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <Primitive.Indicator className="flex items-center justify-center text-current">
      <Check className="size-4" />
    </Primitive.Indicator>
  </Primitive.Root>
))
Checkbox.displayName = 'Checkbox'
