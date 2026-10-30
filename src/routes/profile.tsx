import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  updateProfileInputSchema,
  changePasswordInputSchema,
  type User,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from '@/domain/auth'
import {
  getProfile,
  updateProfile,
  alterAvatar,
  changePassword,
} from '@/api/profile'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { Fields, fieldFailure } from '@/features/account/fields'
import { AsyncState } from '@/components/async-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Profile() {
  const { session, generation } = useSession()
  const query = useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: ({ signal }) => getProfile(signal),
    enabled: !!session,
    retry: false,
  })
  return (
    <section>
      <h1>Perfil do colecionador</h1>
      <AsyncState
        query={query}
        loading="Carregando perfil…"
        error="Não foi possível carregar o perfil."
      />
      {query.data && session && (
        <ProfileForms
          key={`${session.user.id}:${generation}`}
          user={query.data}
          generation={generation}
        />
      )}
    </section>
  )
}
function ProfileForms({
  user,
  generation,
}: {
  user: User
  generation: number
}) {
  const client = useQueryClient()
  const current = () => generation === sessionStore.getSnapshot().generation
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    defaultValues: user,
  })
  const password = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordInputSchema),
  })
  const [success, setSuccess] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [preview, setPreview] = useState<string>()
  const [avatarError, setAvatarError] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  async function saved(updated: User) {
    client.setQueryData(['profile', user.id], updated)
    form.setValue('version', updated.version)
    await client.invalidateQueries({ queryKey: ['auth-session', user.id] })
  }
  async function avatar(remove = false) {
    setBusy(true)
    setAvatarError('')
    setAvatarSuccess('')
    try {
      const updated = await alterAvatar(
        remove ? undefined : { dataUrl: preview! },
      )
      if (!current()) return
      await saved(updated)
      setPreview(undefined)
      setAvatarSuccess(remove ? 'Avatar removido.' : 'Avatar alterado.')
    } catch {
      if (current()) setAvatarError('Não foi possível alterar o avatar.')
    } finally {
      if (current()) setBusy(false)
    }
  }
  return (
    <>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (input) => {
          setSuccess('')
          try {
            const updated = await updateProfile(input)
            if (!current()) return
            form.reset(updated)
            await saved(updated)
            setSuccess('Perfil salvo.')
          } catch (error) {
            if (current()) fieldFailure(form, error, 'email')
          }
        })}
      >
        <h2>Dados do perfil</h2>
        <fieldset disabled={form.formState.isSubmitting || busy}>
          <Fields
            form={form}
            prefix="profile"
            labels={{
              username: 'Usuário',
              displayName: 'Nome de exibição',
              email: 'E-mail',
              ensName: 'Nome ENS',
              walletNickname: 'Apelido da carteira',
            }}
          />
          <Button type="submit">Salvar perfil</Button>
        </fieldset>
        {form.formState.errors.root && (
          <p role="alert">{form.formState.errors.root.message}</p>
        )}
        {success && <p role="status">{success}</p>}
      </form>
      <section aria-label="Avatar">
        <h2>Avatar</h2>
        {(preview || user.avatarUrl) && (
          <img src={preview || user.avatarUrl} alt="Avatar do perfil" />
        )}
        <label htmlFor="avatar">Imagem do avatar</label>
        <Input
          id="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          aria-invalid={!!avatarError}
          aria-describedby={avatarError ? 'avatar-error' : undefined}
          onChange={(event) => {
            setPreview(undefined)
            setAvatarError('')
            setAvatarSuccess('')
            const file = event.target.files?.[0]
            if (!file) return
            if (
              !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
              file.size > 1024 * 1024
            ) {
              setAvatarError('Use PNG, JPEG ou WebP de até 1 MiB.')
              return
            }
            const reader = new FileReader()
            reader.onload = () => {
              if (current() && event.target.files?.[0] === file)
                setPreview(String(reader.result))
            }
            reader.onerror = () => {
              if (current()) setAvatarError('Não foi possível ler a imagem.')
            }
            reader.readAsDataURL(file)
          }}
        />
        {avatarError && (
          <p id="avatar-error" role="alert">
            {avatarError}
          </p>
        )}
        <Button
          disabled={busy || !preview || form.formState.isSubmitting}
          onClick={() => void avatar()}
        >
          Alterar
        </Button>
        <Button
          disabled={busy || form.formState.isSubmitting}
          onClick={() => void avatar(true)}
        >
          Remover
        </Button>
        {avatarSuccess && <p role="status">{avatarSuccess}</p>}
      </section>
      <form
        noValidate
        onSubmit={password.handleSubmit(async (input) => {
          setPasswordSuccess('')
          try {
            await changePassword(input)
            if (!current()) return
            const updated = await getProfile()
            if (!current()) return
            await saved(updated)
            password.reset()
            setPasswordSuccess('Senha alterada.')
          } catch (error) {
            if (current()) fieldFailure(password, error, 'currentPassword')
          }
        })}
      >
        <h2>Alterar senha</h2>
        <fieldset disabled={password.formState.isSubmitting}>
          <Fields
            form={password}
            prefix="password"
            labels={{
              currentPassword: 'Senha atual',
              newPassword: 'Nova senha',
              confirmPassword: 'Confirme a nova senha',
            }}
          />
          <Button type="submit">Alterar senha</Button>
        </fieldset>
        {password.formState.errors.root && (
          <p role="alert">{password.formState.errors.root.message}</p>
        )}
        {passwordSuccess && <p role="status">{passwordSuccess}</p>}
      </form>
    </>
  )
}
