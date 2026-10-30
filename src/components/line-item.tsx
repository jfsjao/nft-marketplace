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
    <article
      className={
        quantity
          ? 'grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-card p-3 md:grid-cols-[minmax(0,2fr)_minmax(90px,1fr)_144px_minmax(90px,1fr)_40px] md:rounded-md'
          : 'flex min-w-0 flex-wrap items-center gap-3 rounded-lg bg-card p-3'
      }
    >
      <div
        className={
          quantity
            ? 'contents md:flex md:min-w-0 md:items-center md:gap-4'
            : 'flex min-w-0 flex-1 items-center gap-3'
        }
      >
        <img
          src={item.imageUrl || undefined}
          alt={item.name}
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="size-20 rounded-lg object-cover md:size-16"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            {item.name}
            {'editionLabel' in item && ` — ${item.editionLabel}`}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Token: {item.tokenId}
          </p>
        </div>
      </div>
      <p
        className={
          quantity
            ? 'text-sm text-text-secondary'
            : 'text-xs text-text-secondary'
        }
      >
        {!quantity && <>{item.quantity} × </>}
        <EthPrice value={item.unitPriceEth} />
        <span className="sr-only">{quantity ? ' por unidade; ' : '; '}</span>
      </p>
      {quantity}
      <p className="text-sm font-semibold text-highlight">
        <EthPrice value={item.lineTotalEth} />
      </p>
      {children}
    </article>
  )
}
