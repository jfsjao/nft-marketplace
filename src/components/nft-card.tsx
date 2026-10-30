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
    <>
      <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
        <img src={nft.imageUrl} alt={nft.name} width={160} height={160} />
        <h2>{nft.name}</h2>
      </Link>
      <p>
        <EthPrice value={nft.priceEth} compareAt={nft.compareAtPriceEth} />{' '}
        {nft.soldOut && '— Esgotado'}
      </p>
      {actions}
    </>
  )
}
