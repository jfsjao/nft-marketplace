import * as React from 'react'
import { cn } from '@/lib/utils'
import * as Primitive from '@radix-ui/react-avatar'
export const Avatar = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    ref={ref}
    className={cn(
      'relative flex size-10 shrink-0 overflow-hidden rounded-full',
      className,
    )}
    {...props}
  />
))
Avatar.displayName = Primitive.Root.displayName
export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof Primitive.Image>,
  React.ComponentPropsWithoutRef<typeof Primitive.Image>
>(({ className, ...props }, ref) => (
  <Primitive.Image
    ref={ref}
    className={cn('aspect-square size-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = Primitive.Image.displayName
export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof Primitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof Primitive.Fallback>
>(({ className, ...props }, ref) => (
  <Primitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-muted',
      className,
    )}
    {...props}
  />
))
AvatarFallback.displayName = Primitive.Fallback.displayName
