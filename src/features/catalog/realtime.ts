import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { observeRealtime } from '@/lib/socket'
import type { NftDetail } from '@/domain/nft'

export function useCatalogRealtime() {
  const client = useQueryClient()
  useEffect(
    () =>
      observeRealtime(
        (event) => {
          if (event.type !== 'nft.updated') return
          const key = ['nft', event.resource.nftId]
          client.setQueryData<NftDetail>(key, (previous) => {
            if (!previous) return previous
            return {
              ...previous,
              editions: previous.editions.map((edition) =>
                edition.id === event.resource.editionId &&
                edition.version < event.version
                  ? { ...edition, ...event.data, version: event.version }
                  : edition,
              ),
            }
          })
          void client
            .cancelQueries({ queryKey: key }, { revert: false })
            .then(() => client.invalidateQueries({ queryKey: key }))
          void client
            .cancelQueries({ queryKey: ['nfts'] })
            .then(() => client.invalidateQueries({ queryKey: ['nfts'] }))
        },
        () => {
          // Reconexão: eventos perdidos não voltam, então recarrega pela API.
          for (const key of ['nft', 'nfts', 'cart', 'quote', 'orders'])
            void client.invalidateQueries({ queryKey: [key] })
        },
      ),
    [client],
  )
}
