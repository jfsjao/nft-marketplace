import * as React from 'react'
import { cn } from '@/lib/utils'
import * as Primitive from '@radix-ui/react-dialog'
export const Drawer = Primitive.Root
export const DrawerTrigger = Primitive.Trigger
export const DrawerPortal = Primitive.Portal
export const DrawerClose = Primitive.Close
import {
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from './dialog'
export const DrawerOverlay = DialogOverlay
export const DrawerTitle = DialogTitle
export const DrawerDescription = DialogDescription
export const DrawerHeader = DialogHeader
export const DrawerFooter = DialogFooter
export const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <Primitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-y-auto rounded-t-xl border bg-background p-6',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted"
      />
      {children}
    </Primitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'
