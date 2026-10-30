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
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className="font-bold text-highlight">{formatEth(value)} ETH</span>
      {compareAt && (
        <s className="text-sm text-muted-foreground">
          {formatEth(compareAt)} ETH
        </s>
      )}
    </span>
  )
}
