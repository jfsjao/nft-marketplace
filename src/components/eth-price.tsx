import type { NftSummary } from '@/domain/nft'
import { formatEth } from '@/lib/eth'

export function EthPrice({
  value,
  compareAt,
}: {
  value: NftSummary['priceEth']
  compareAt?: NftSummary['compareAtPriceEth']
}) {
  return (
    <>
      {compareAt && (
        <>
          <s>{formatEth(compareAt)} ETH</s>{' '}
        </>
      )}
      {formatEth(value)} ETH
    </>
  )
}
