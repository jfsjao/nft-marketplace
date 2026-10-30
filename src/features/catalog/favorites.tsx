import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { api } from '@/api/client'
import { favoritesSchema, type Favorites } from '@/domain/favorites'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function useFavorites() {
  const { session, generation } = useSession()
  const userId = session?.user.id
  const client = useQueryClient()
  const key = ['favorites', userId]
  const current = () => sessionStore.getSnapshot().generation === generation
  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async ({ signal }) =>
      favoritesSchema.parse((await api.get('/favorites', { signal })).data),
  })
  const busy = useIsMutating({ mutationKey: key }) > 0
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) =>
      favoritesSchema.parse(
        (
          await api.request({
            url: `/favorites/${encodeURIComponent(id)}`,
            method: favorite ? 'PUT' : 'DELETE',
          })
        ).data,
      ),
    onMutate: async ({ id, favorite }) => {
      await client.cancelQueries({ queryKey: key })
      if (!current()) return
      const previous = client.getQueryData<Favorites>(key)
      client.setQueryData<Favorites>(key, {
        nftIds: favorite
          ? [...new Set([...(previous?.nftIds ?? []), id])]
          : (previous?.nftIds ?? []).filter((value) => value !== id),
      })
      return previous
    },
    onError: (_error, _variables, previous) => {
      if (current() && previous) client.setQueryData(key, previous)
    },
    onSettled: () => {
      if (current()) void client.invalidateQueries({ queryKey: key })
    },
  })
  return { ...query, mutation, userId, busy }
}

export function FavoriteButton({ id }: { id: string }) {
  const { data, isPending, isError, refetch, mutation, userId, busy } =
    useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const favorite = data?.nftIds.includes(id) ?? false
  if (userId && isPending)
    return <Skeleton aria-label="Carregando favoritos" className="h-9 w-32" />
  if (userId && isError)
    return (
      <Button onClick={() => void refetch()}>Tentar novamente favoritos</Button>
    )
  return (
    <>
      <Button
        variant="outline"
        className="text-primary aria-pressed:bg-primary/15"
        aria-pressed={favorite}
        disabled={busy}
        onClick={() => {
          if (!userId)
            void navigate({ to: '/login', search: { redirect: location.href } })
          else mutation.mutate({ id, favorite: !favorite })
        }}
      >
        <img
          src="/assets/icons/interface/coracao.svg"
          alt=""
          className="size-4"
        />
        {favorite ? 'Remover favorito' : 'Favoritar'}
      </Button>
      {mutation.isError && (
        <p role="alert">
          Não foi possível atualizar favorito. Tente novamente.
        </p>
      )}
    </>
  )
}
