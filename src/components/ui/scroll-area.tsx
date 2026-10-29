import * as React from 'react'
import { cn } from '@/lib/utils'
import * as Primitive from '@radix-ui/react-scroll-area'
export const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof Primitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof Primitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <Primitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none p-px transition-colors',
      orientation === 'vertical'
        ? 'h-full w-2.5 border-l border-l-transparent'
        : 'h-2.5 flex-col border-t border-t-transparent',
      className,
    )}
    {...props}
  >
    <Primitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </Primitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = 'ScrollBar'
export const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, children, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <Primitive.Viewport className="size-full rounded-[inherit]">
      {children}
    </Primitive.Viewport>
    <ScrollBar />
    <Primitive.Corner />
  </Primitive.Root>
))
ScrollArea.displayName = 'ScrollArea'
