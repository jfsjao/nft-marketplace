import { useSyncExternalStore, type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from './ui/drawer'
import { Button } from './ui/button'

const media = '(max-width: 767px)'
const subscribe = (update: () => void) => {
  const query = window.matchMedia?.(media)
  query?.addEventListener('change', update)
  return () => query?.removeEventListener('change', update)
}
export function CatalogFilters({ children }: { children: ReactNode }) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(media).matches ?? false,
    () => false,
  )
  if (!mobile)
    return (
      <aside className="row-span-3 space-y-7 bg-card p-5">{children}</aside>
    )
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full">
          <SlidersHorizontal />
          Filtros
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle>Filtros do catálogo</DrawerTitle>
        <DrawerDescription>
          Selecione coleções, redes e faixa de preço.
        </DrawerDescription>
        <div className="my-5 space-y-7">{children}</div>
        <DrawerClose asChild>
          <Button>Ver resultados</Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}
