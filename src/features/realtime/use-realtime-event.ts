import { useEffect, useEffectEvent } from 'react'
import type { ServerEvent } from '@/domain/events'
import { observeRealtime } from '@/lib/socket'

// Usa o socket único aberto pelo SessionProvider.
export function useRealtimeEvent<T extends ServerEvent['type']>(
  type: T,
  cb: (event: Extract<ServerEvent, { type: T }>) => void,
) {
  const onEvent = useEffectEvent(cb)
  useEffect(
    () =>
      observeRealtime((event) => {
        if (event.type === type)
          onEvent(event as Extract<ServerEvent, { type: T }>)
      }),
    [type],
  )
}
