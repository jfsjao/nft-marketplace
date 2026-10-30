import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { UserRound, Wallet, LogOut } from 'lucide-react'
import { useSession } from '@/features/session/use-session'
import { Button } from './ui/button'

export function AccountLayout({ children }: { children: ReactNode }) {
  const { logout } = useSession()
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Meu perfil" className="rounded-lg bg-card py-4 text-sm">
        <h2 className="px-5 pb-3 font-bold">Meu perfil</h2>
        <Link
          to="/profile"
          activeProps={{ 'aria-current': 'page' }}
          className="flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-primary aria-[current=page]:border-primary aria-[current=page]:bg-accent"
        >
          <UserRound size={18} />
          Dados do perfil
        </Link>
        <Link
          to="/wallets"
          activeProps={{ 'aria-current': 'page' }}
          className="flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-primary aria-[current=page]:border-primary aria-[current=page]:bg-accent"
        >
          <Wallet size={18} />
          Carteiras
        </Link>
        <div className="mt-3 border-t px-4 pt-3">
          <Button
            variant="ghost"
            onClick={() => void logout()}
            className="text-primary"
          >
            <LogOut />
            Sair
          </Button>
        </div>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
