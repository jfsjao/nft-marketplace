import { Button } from './ui/button'

export function KurioHero() {
  return (
    <section className="relative grid grid-cols-[1.2fr_1fr] items-center gap-3 overflow-hidden rounded-3xl bg-kurio-warm p-4 md:gap-12 md:rounded-none md:bg-none md:px-8 md:py-6 lg:gap-24">
      <div className="relative z-10">
        <p className="mb-2 text-xs font-medium tracking-wide md:mb-4 md:text-sm">
          Bem-vindo à Kurio
        </p>
        <p className="text-lg font-bold leading-relaxed md:text-3xl lg:text-4xl">
          SEJA DONO DO FUTURO DA ARTE DIGITAL
        </p>
        <p className="mt-3 text-xs leading-relaxed text-text-secondary md:text-sm">
          Descubra NFTs selecionados de criadores do mundo todo. Colecione arte
          digital rara e apoie artistas.
        </p>
        <Button asChild className="mt-4 px-3 md:mt-6 md:px-6">
          <a href="#catalogo">
            EXPLORAR <span aria-hidden="true">→</span>
          </a>
        </Button>
      </div>
      <img
        src="/assets/nfts/ape-esmeralda.webp"
        alt=""
        width={500}
        height={500}
        fetchPriority="high"
        decoding="async"
        className="aspect-square w-full rounded-2xl object-cover md:max-h-[420px]"
      />
      <div
        aria-hidden="true"
        className="col-span-2 flex justify-center gap-2 pb-1 md:pb-5"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 rounded-full bg-primary" />
        ))}
      </div>
    </section>
  )
}
