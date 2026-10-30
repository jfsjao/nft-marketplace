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
    <dl aria-label="Resumo do pedido" className="space-y-4 text-sm">
      {(
        [
          ['Subtotal', 'subtotalEth'],
          ['Desconto', 'discountEth'],
          ['Taxa de rede', 'networkFeeEth'],
          ['Total', 'totalEth'],
        ] as const
      ).map(([label, key]) => (
        <div
          key={key}
          className={`flex items-baseline justify-between gap-4 ${key === 'totalEth' ? 'border-t pt-4 text-base font-bold' : 'text-text-secondary'}`}
        >
          <dt>{label}</dt>
          <dd
            className={
              key === 'totalEth' ? 'text-highlight' : 'text-foreground'
            }
          >
            <EthPrice value={snapshot[key]} />
            {key === 'networkFeeEth' && (
              <span className="mt-1 block text-right text-xs font-normal text-highlight">
                Taxa estimada
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
