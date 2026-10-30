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
}: Partial<State> & {
  query?: State
  loading?: string
  error?: ReactNode
  empty?: boolean
  emptyMessage?: ReactNode
  className?: string
}) {
  const state = query ?? { isPending, isError, refetch }
  if (state.isPending)
    return <Skeleton aria-label={loading} className={className} />
  if (state.isError)
    return (
      <div role="alert">
        {error}{' '}
        <Button onClick={() => void state.refetch?.()}>Tentar novamente</Button>
      </div>
    )
  return empty ? <p>{emptyMessage}</p> : null
}
