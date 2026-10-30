import type { ReactNode } from 'react'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

type State = { isPending: boolean; isError: boolean; refetch: () => unknown }
export function AsyncState({
  query,
  isPending = false,
  isError = false,
  refetch,
  loading,
  error,
  empty = false,
  emptyMessage,
  className = 'h-40',
  layout,
}: Partial<State> & {
  query?: State
  loading?: string
  error?: ReactNode
  empty?: boolean
  emptyMessage?: ReactNode
  layout?: 'catalog' | 'detail' | 'related'
  className?: string
}) {
  const state = query ?? { isPending, isError, refetch }
  if (state.isPending) {
    if (layout === 'catalog')
      return (
        <div
          role="status"
          aria-label={loading}
          className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-12"
        >
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="min-w-0">
              <Skeleton className="aspect-square w-full rounded-3xl md:rounded-lg" />
              <Skeleton className="mt-3 h-6 w-4/5" />
              <Skeleton className="mt-1 h-6 w-1/2" />
              <Skeleton className="mt-2 h-8 w-24" />
            </div>
          ))}
        </div>
      )
    if (layout === 'detail')
      return (
        <div
          role="status"
          aria-label={loading}
          className="grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-12"
        >
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-5">
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-6 md:col-span-2 md:mt-20">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="mt-8 h-6 w-1/4" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-square w-full rounded-3xl"
                />
              ))}
            </div>
          </div>
        </div>
      )
    if (layout === 'related')
      return (
        <div
          role="status"
          aria-label={loading}
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="min-w-0">
              <div className="rounded-3xl bg-card p-2 pt-3 md:rounded-none md:p-3">
                <Skeleton className="aspect-square w-full rounded-2xl" />
              </div>
              <Skeleton className="mt-3 h-6 w-4/5" />
              <Skeleton className="mt-1 h-5 w-1/3" />
            </div>
          ))}
        </div>
      )
    return (
      <Skeleton
        role="status"
        aria-hidden={false}
        aria-label={loading}
        className={className}
      />
    )
  }
  if (state.isError)
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/40 bg-card p-5 text-sm"
      >
        {error}{' '}
        <Button onClick={() => void state.refetch?.()}>Tentar novamente</Button>
      </div>
    )
  return empty ? (
    <p className="rounded-lg border bg-card px-6 py-12 text-center text-text-secondary">
      {emptyMessage}
    </p>
  ) : null
}
