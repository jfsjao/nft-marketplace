import type { Quote } from '@/domain/quote'
import { EthPrice } from './eth-price'

export function OrderSummary({
  snapshot,
}: {
  snapshot: Pick<
    Quote,
    'subtotalEth' | 'discountEth' | 'networkFeeEth' | 'totalEth'
  >
}) {
  return (
    <dl>
      {(
        [
          ['Subtotal', 'subtotalEth'],
          ['Desconto', 'discountEth'],
          ['Taxa de rede', 'networkFeeEth'],
          ['Total', 'totalEth'],
        ] as const
      ).map(([label, key]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>
            <EthPrice value={snapshot[key]} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
