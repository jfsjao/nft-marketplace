import type { Quote } from '@/domain/quote'
import { formatEth } from '@/lib/eth'

export function Totals({
  snapshot,
}: {
  snapshot: Pick<
    Quote,
    'lines' | 'subtotalEth' | 'discountEth' | 'networkFeeEth' | 'totalEth'
  >
}) {
  return (
    <>
      <ul>
        {snapshot.lines.map((line) => (
          <li key={`${line.nftId}:${line.editionId}`}>
            {line.name} — {line.quantity} × {formatEth(line.unitPriceEth)} ETH;{' '}
            {formatEth(line.lineTotalEth)} ETH
          </li>
        ))}
      </ul>
      <dl>
        <dt>Subtotal</dt>
        <dd>{formatEth(snapshot.subtotalEth)} ETH</dd>
        <dt>Desconto</dt>
        <dd>{formatEth(snapshot.discountEth)} ETH</dd>
        <dt>Taxa de rede</dt>
        <dd>{formatEth(snapshot.networkFeeEth)} ETH</dd>
        <dt>Total</dt>
        <dd>{formatEth(snapshot.totalEth)} ETH</dd>
      </dl>
    </>
  )
}
