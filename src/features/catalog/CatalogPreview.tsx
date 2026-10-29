import { useQuery } from '@tanstack/react-query'
import { listNfts } from '@/api/nfts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function CatalogPreview() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['nfts'],
    queryFn: ({ signal }) => listNfts(signal),
  })

  return (
    <section aria-labelledby="catalog-title" className="space-y-5">
      <h2 id="catalog-title" className="text-xl font-bold">
        NFTs da coleção
      </h2>
      {isPending ? (
        <div
          role="status"
          aria-label="Carregando NFTs"
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="space-y-3">
          <p>Não foi possível carregar os NFTs.</p>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : data.items.length === 0 ? (
        <p>Nenhum NFT encontrado.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.items.map((nft) => (
            <li key={nft.id} className="min-w-0 space-y-2">
              <div className="rounded-lg bg-card p-2">
                <img
                  src={nft.imageUrl}
                  alt={nft.name}
                  width={500}
                  height={500}
                  className="aspect-square w-full rounded-md object-cover"
                />
              </div>
              <h3 className="text-sm">{nft.name}</h3>
              <p className="font-bold text-highlight">{nft.priceEth} ETH</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
