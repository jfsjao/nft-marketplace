import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { catalogSearchSchema } from '@/features/catalog/search'
import { KurioHero } from './kurio-hero'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[80dvh] md:py-16">
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      >
        <KurioHero />
        <div className="mt-12 grid grid-cols-3 gap-8">
          {['ape-fones-verdes', 'ape-blazer', 'ape-esmeralda'].map((name) => (
            <img
              key={name}
              alt=""
              src={`/assets/nfts/${name}.webp`}
              width={500}
              height={500}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-xl opacity-50"
            />
          ))}
        </div>
        {/* Véu do modal: a página atrás fica só como contexto. */}
        <div className="absolute inset-0 bg-background/70" />
      </div>
      <section className="relative z-10 mx-auto max-w-md space-y-8 py-10 md:border-b-8 md:border-primary md:bg-card md:px-10 md:py-12 md:shadow-2xl">
        <Link
          to="/"
          search={catalogSearchSchema.parse({})}
          aria-label="Fechar"
          className="absolute top-4 right-4 rounded p-1 text-primary hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-5" />
        </Link>
        <p className="mb-16 text-center text-3xl font-bold tracking-widest md:hidden">
          KURIO
        </p>
        {children}
      </section>
    </div>
  )
}
