import type { ReactNode } from 'react'
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
              src={`/assets/nfts/${name}.png`}
              className="aspect-square w-full rounded-xl opacity-50"
            />
          ))}
        </div>
      </div>
      <section className="relative mx-auto max-w-md space-y-8 py-10 md:border-b-8 md:border-primary md:bg-card md:px-10 md:py-12">
        <p className="mb-16 text-center text-3xl font-bold tracking-widest md:hidden">
          KURIO
        </p>
        {children}
      </section>
    </div>
  )
}
