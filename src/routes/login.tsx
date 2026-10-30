import { AuthLayout } from '@/components/auth-layout'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AuthForm } from '@/features/session/auth-form'

export function Login() {
  const search = useSearch({ from: '/login' })
  const navigate = useNavigate()
  return (
    <AuthLayout>
      <AuthForm
        mode="login"
        redirect={search.redirect}
        onSuccess={(href) => navigate({ href })}
      />
      <p className="text-center text-sm text-text-secondary">
        Novo na Kurio?{' '}
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to="/register"
          search={search}
        >
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  )
}
