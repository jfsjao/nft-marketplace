import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { apiErrorSchema } from '@/domain/errors'
import { Input } from '@/components/ui/input'

export function Fields<T extends FieldValues>({
  form,
  labels,
  prefix,
}: {
  form: UseFormReturn<T>
  labels: Partial<Record<Path<T>, string>>
  prefix: string
}) {
  return Object.entries(labels).map(([name, label]) => {
    const field = name as Path<T>
    const error = form.formState.errors[field]?.message
    const id = `${prefix}-${name}`
    return (
      <div key={name} className="min-w-0 space-y-2 text-sm">
        <label htmlFor={id}>{String(label)}</label>
        <Input
          id={id}
          type={
            name.includes('Password')
              ? 'password'
              : name === 'email'
                ? 'email'
                : 'text'
          }
          {...form.register(field)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p className="text-destructive" id={`${id}-error`}>
            {String(error)}
          </p>
        )}
      </div>
    )
  })
}
export function fieldFailure<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  fallback?: Path<T>,
) {
  const parsed = apiErrorSchema.safeParse(error)
  const failure = parsed.success ? parsed.data : undefined
  form.setError('root', {
    message: failure?.message ?? 'Não foi possível salvar. Tente novamente.',
  })
  for (const [field, messages] of Object.entries(failure?.fieldErrors ?? {})) {
    if (field in form.getValues())
      form.setError(field as Path<T>, { message: messages.join(' ') })
  }
  if (
    fallback &&
    !Object.keys(failure?.fieldErrors ?? {}).length &&
    (failure?.code === 'CONFLICT' || failure?.code === 'VALIDATION_ERROR')
  )
    form.setError(fallback, { message: failure.message })
}
