import * as React from 'react'
import { cn } from '@/lib/utils'
import * as Primitive from '@radix-ui/react-select'
export const Select = Primitive.Root
export const SelectGroup = Primitive.Group
export const SelectValue = Primitive.Value
export const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof Primitive.Label>,
  React.ComponentPropsWithoutRef<typeof Primitive.Label>
>(({ className, ...props }, ref) => (
  <Primitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
))
SelectLabel.displayName = Primitive.Label.displayName
export const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof Primitive.Separator>,
  React.ComponentPropsWithoutRef<typeof Primitive.Separator>
>(({ className, ...props }, ref) => (
  <Primitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
SelectSeparator.displayName = Primitive.Separator.displayName
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <Primitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate',
      className,
    )}
    {...props}
  >
    {children}
    <Primitive.Icon asChild>
      <ChevronDown className="size-4 opacity-50" />
    </Primitive.Icon>
  </Primitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'
export const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof Primitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof Primitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <Primitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronUp className="size-4" />
  </Primitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = 'SelectScrollUpButton'
export const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof Primitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof Primitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <Primitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronDown className="size-4" />
  </Primitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = 'SelectScrollDownButton'
export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-[var(--radix-select-content-available-height)] min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        position === 'popper' && 'min-w-[var(--radix-select-trigger-width)]',
        className,
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
      <SelectScrollDownButton />
    </Primitive.Content>
  </Primitive.Portal>
))
SelectContent.displayName = 'SelectContent'
export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item>
>(({ className, children, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <Primitive.ItemIndicator>
        <Check className="size-4" />
      </Primitive.ItemIndicator>
    </span>
    <Primitive.ItemText>{children}</Primitive.ItemText>
  </Primitive.Item>
))
SelectItem.displayName = 'SelectItem'
