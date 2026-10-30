import type { ReactNode } from 'react'
import type { CartItem } from '@/domain/cart'
import type { QuoteLine } from '@/domain/quote'
import { EthPrice } from './eth-price'

export function LineItem({
  item,
  quantity,
  children,
}: {
  item: QuoteLine | CartItem
  quantity?: ReactNode
  children?: ReactNode
}) {
  return (
    <>
      <img
        src={item.imageUrl || undefined}
        alt={item.name}
        width={160}
        height={160}
      />
      <h2>
        {item.name}
        {'editionLabel' in item && ` — ${item.editionLabel}`}
      </h2>
      <p>Token: {item.tokenId}</p>
      <p>
        {!quantity && <>{item.quantity} × </>}
        <EthPrice value={item.unitPriceEth} />
        {quantity ? ' por unidade; ' : '; '}
        <EthPrice value={item.lineTotalEth} />
      </p>
      {quantity}
      {children}
    </>
  )
}
