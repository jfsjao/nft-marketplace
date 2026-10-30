import { z } from 'zod'
import { useForm, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginInputSchema, registerInputSchema } from '@/domain/auth'
import { apiErrorSchema } from '@/domain/errors'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSession } from './use-session'
import { validateRedirect } from '@/routes/redirect'

export function AuthForm({
  mode,
  redirect,
  onSuccess,
}: {
  mode: 'login' | 'register'
  redirect?: string
  onSuccess: (path: string) => void | Promise<unknown>
}) {
  const session = useSession()
  const isRegister = mode === 'register'
  const schema = isRegister
    ? registerInputSchema
    : loginInputSchema.extend({
        username: z.string().optional(),
        confirmPassword: z.string().optional(),
      })
  type Fields = z.infer<typeof schema>
  const form = useForm<Fields>({ resolver: zodResolver(schema) })
  const fields = isRegister
    ? (['username', 'email', 'password', 'confirmPassword'] as const)
    : (['email', 'password'] as const)
  const labels = {
    username: 'Usuário',
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirme a senha',
  }
  const submit = form.handleSubmit(async (values) => {
    try {
      await (isRegister
        ? session.register(registerInputSchema.parse(values))
        : session.login(values))
      await onSuccess(
        validateRedirect(redirect) ?? validateRedirect(session.returnTo) ?? '/',
      )
    } catch (error) {
      const parsed = apiErrorSchema.safeParse(error)
      const failure = parsed.success ? parsed.data : undefined
      form.setError('root', {
        message:
          failure?.message ?? 'Não foi possível concluir. Tente novamente.',
      })
      for (const [field, messages] of Object.entries(
        failure?.fieldErrors ?? {},
      )) {
        if (fields.some((name) => name === field))
          form.setError(field as Path<Fields>, {
            message: messages.join(' '),
          })
      }
      if (failure?.code === 'UNAUTHORIZED')
        form.setError('password', { message: 'E-mail ou senha incorretos' })
      if (isRegister && failure?.code === 'CONFLICT' && !failure.fieldErrors) {
        form.setError('email', { message: 'E-mail ou usuário já cadastrado' })
        form.setError('username', {
          message: 'E-mail ou usuário já cadastrado',
        })
      }
    }
  })
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <h1 className="mb-8 text-center text-2xl font-bold">
        {isRegister ? 'Criar conta' : 'Entrar'}
      </h1>
      {fields.map((name) => (
        <div key={name}>
          <label
            className="mb-2 block text-xs text-muted-foreground"
            htmlFor={name}
          >
            {labels[name]}
          </label>
          <Input
            className="h-12 rounded-lg border-border bg-transparent px-4 placeholder:text-muted-foreground focus-visible:border-primary"
            placeholder={
              {
                username: 'Nome de usuário',
                email: 'Digite seu e-mail',
                password: 'Senha',
                confirmPassword: 'Confirmar senha',
              }[name]
            }
            id={name}
            type={
              name.includes('assword')
                ? 'password'
                : name === 'email'
                  ? 'email'
                  : 'text'
            }
            autoComplete={
              name === 'password'
                ? isRegister
                  ? 'new-password'
                  : 'current-password'
                : name === 'confirmPassword'
                  ? 'new-password'
                  : name
            }
            aria-invalid={!!form.formState.errors[name]}
            aria-describedby={
              form.formState.errors[name] ? `${name}-error` : undefined
            }
            {...form.register(name)}
          />
          {form.formState.errors[name] && (
            <p className="mt-2 text-xs text-destructive" id={`${name}-error`}>
              {form.formState.errors[name]?.message}
            </p>
          )}
        </div>
      ))}
      {form.formState.errors.root && (
        <p className="text-sm text-destructive" role="alert">
          {form.formState.errors.root.message}
        </p>
      )}
      {!isRegister && (
        <div className="text-right">
          <button
            type="button"
            disabled
            className="text-sm text-primary"
            title="Recuperação de senha indisponível nesta versão"
          >
            Esqueceu a senha?
          </button>
        </div>
      )}
      <Button
        className="mt-5 h-14 w-full text-base font-bold"
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting
          ? 'Aguarde…'
          : isRegister
            ? 'Cadastrar'
            : 'Entrar'}
      </Button>
      <div className="pt-6">
        <div className="mb-5 flex items-center gap-3 text-xs">
          <span className="h-px flex-1 bg-border" />
          Ou continue com
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full text-text-secondary"
            disabled
          >
            <span aria-hidden="true" className="text-xl font-bold text-primary">
              G
            </span>
            Continuar com Google
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full text-text-secondary"
            disabled
          >
            <img
              src="/assets/icons/redes-sociais/facebook.svg"
              alt=""
              className="size-5"
            />
            Continuar com Facebook
          </Button>
        </div>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Login social indisponível nesta versão.
        </p>
      </div>
    </form>
  )
}
