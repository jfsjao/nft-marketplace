import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AuthForm } from '@/features/session/auth-form'

export function Login() {
  const search = useSearch({ from: '/login' })
  const navigate = useNavigate()
  return (
    <>
      <AuthForm
        mode="login"
        redirect={search.redirect}
        onSuccess={(href) => navigate({ href })}
      />
      <Link to="/register" search={search}>
        Criar conta
      </Link>
    </>
  )
}
