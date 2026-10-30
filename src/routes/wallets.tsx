import { AccountLayout } from '@/components/account-layout'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  walletInputSchema,
  type WalletInput,
  type Wallet,
} from '@/domain/wallet'
import { networkSchema, walletProviderSchema } from '@/domain/common'
import { getWallets, saveWallet } from '@/api/wallets'
import { useSession } from '@/features/session/use-session'
import { sessionStore } from '@/features/session/store'
import { Fields, fieldFailure } from '@/features/account/fields'
import { AsyncState } from '@/components/async-state'
import { Button } from '@/components/ui/button'

export function Wallets() {
  const { session, generation } = useSession()
  const query = useQuery({
    queryKey: ['wallets', session?.user.id],
    queryFn: ({ signal }) => getWallets(signal),
    enabled: !!session,
    retry: false,
  })
  return (
    <AccountLayout>
      <section className="space-y-7">
        <h1 className="text-xl font-bold">Carteiras</h1>
        <AsyncState
          query={query}
          loading="Carregando carteiras…"
          error="Não foi possível carregar carteiras."
        />
        {query.data &&
          session &&
          (['primary', 'secondary'] as const).map((slot) => (
            <WalletForm
              key={`${session.user.id}:${generation}:${slot}`}
              wallet={query.data.find((wallet) => wallet.slot === slot)}
              slot={slot}
              userId={session.user.id}
              generation={generation}
            />
          ))}
      </section>
    </AccountLayout>
  )
}
function WalletForm({
  wallet,
  slot,
  userId,
  generation,
}: {
  wallet?: Wallet
  slot: WalletInput['slot']
  userId: string
  generation: number
}) {
  const client = useQueryClient()
  const [success, setSuccess] = useState('')
  const form = useForm<WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: wallet ?? {
      slot,
      network: 'ethereum',
      provider: 'metamask',
    },
  })
  return (
    <form
      className="space-y-5 border-t pt-6 first:border-t-0 first:pt-0"
      noValidate
      onSubmit={form.handleSubmit(async (input) => {
        setSuccess('')
        try {
          const saved = await saveWallet(input)
          if (generation !== sessionStore.getSnapshot().generation) return
          client.setQueryData<Wallet[]>(['wallets', userId], (old) => [
            ...(old ?? []).filter((item) => item.slot !== slot),
            saved,
          ])
          form.reset(saved)
          setSuccess('Carteira salva.')
        } catch (error) {
          if (generation === sessionStore.getSnapshot().generation)
            fieldFailure(form, error, 'address')
        }
      })}
    >
      <h2 className="mb-5 font-semibold">
        Carteira {slot === 'primary' ? 'principal' : 'secundária'}
      </h2>
      {!wallet && slot === 'secondary' && (
        <p>Você ainda não adicionou uma carteira secundária</p>
      )}
      <fieldset
        className="grid min-w-0 gap-5 md:grid-cols-2 [&>button]:col-span-full [&>button]:justify-self-start"
        disabled={form.formState.isSubmitting}
      >
        <Fields
          form={form}
          prefix={slot}
          labels={{
            displayName: 'Nome de exibição',
            nickname: 'Apelido',
            address: 'Endereço',
            ensOrSecondaryAddress: 'ENS ou endereço secundário',
            profileName: 'Nome do perfil',
            referralCode: 'Código de indicação',
            email: 'E-mail',
            ensName: 'Nome ENS',
          }}
        />
        {(['network', 'provider'] as const).map((field) => (
          <div key={field}>
            <label htmlFor={`${slot}-${field}`}>
              {field === 'network' ? 'Rede' : 'Provedor'}
            </label>
            <select
              className="mt-2 h-10 w-full text-sm"
              id={`${slot}-${field}`}
              {...form.register(field)}
              aria-invalid={!!form.formState.errors[field]}
              aria-describedby={
                form.formState.errors[field]
                  ? `${slot}-${field}-error`
                  : undefined
              }
            >
              {(field === 'network'
                ? networkSchema
                : walletProviderSchema
              ).options.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            {form.formState.errors[field] && (
              <p id={`${slot}-${field}-error`}>
                {form.formState.errors[field]?.message}
              </p>
            )}
          </div>
        ))}
        <Button type="submit">
          Salvar carteira {slot === 'primary' ? 'principal' : 'secundária'}
        </Button>
      </fieldset>
      {form.formState.errors.root && (
        <p role="alert">{form.formState.errors.root.message}</p>
      )}
      {success && <p role="status">{success}</p>}
    </form>
  )
}
