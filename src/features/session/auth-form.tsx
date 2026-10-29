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
    <form onSubmit={submit} noValidate>
      <h1>{isRegister ? 'Criar conta' : 'Entrar'}</h1>
      {fields.map((name) => (
        <div key={name}>
          <label htmlFor={name}>{labels[name]}</label>
          <Input
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
            <p id={`${name}-error`}>{form.formState.errors[name]?.message}</p>
          )}
        </div>
      ))}
      {form.formState.errors.root && (
        <p role="alert">{form.formState.errors.root.message}</p>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? 'Aguarde…'
          : isRegister
            ? 'Cadastrar'
            : 'Entrar'}
      </Button>
    </form>
  )
}
