import { AuthLayout } from '@/components/auth-layout'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AuthForm } from '@/features/session/auth-form'

export function Register() {
  const search = useSearch({ from: '/register' })
  const navigate = useNavigate()
  return (
    <AuthLayout>
      <AuthForm
        mode="register"
        redirect={search.redirect}
        onSuccess={(href) => navigate({ href })}
      />
      <p className="text-center text-sm text-text-secondary">
        Já tem uma conta?{' '}
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to="/login"
          search={search}
        >
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
