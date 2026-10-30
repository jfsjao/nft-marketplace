import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/domain/nft'
import { EthPrice } from './eth-price'

export function NftCard({
  nft,
  actions,
}: {
  nft: NftSummary
  actions?: ReactNode
}) {
  return (
    <div className="group relative min-w-0">
      <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
        <div className="relative rounded-3xl bg-card p-2 pt-3 md:rounded-none md:p-3">
          <img
            src={nft.imageUrl}
            alt={nft.name}
            width={160}
            height={160}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-2xl object-cover"
          />
          {nft.isRare && (
            <span className="absolute top-4 left-0 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              RARO
            </span>
          )}
        </div>
        <h2 className="mt-3 text-sm leading-6 md:text-base">{nft.name}</h2>
      </Link>
      <p className="text-sm md:text-base">
        <EthPrice value={nft.priceEth} compareAt={nft.compareAtPriceEth} />{' '}
        {nft.soldOut && '— Esgotado'}
      </p>
      <div className="mt-2 [&_button]:h-8 [&_button]:max-w-full [&_button]:border [&_button]:bg-card [&_button]:px-2 [&_button]:text-xs [&_button]:text-primary">
        {actions}
      </div>
    </div>
  )
}
