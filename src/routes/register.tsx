import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AuthForm } from '@/features/session/auth-form'

export function Register() {
  const search = useSearch({ from: '/register' })
  const navigate = useNavigate()
  return (
    <>
      <AuthForm
        mode="register"
        redirect={search.redirect}
        onSuccess={(href) => navigate({ href })}
      />
      <Link to="/login" search={search}>
        Entrar
      </Link>
    </>
  )
}
