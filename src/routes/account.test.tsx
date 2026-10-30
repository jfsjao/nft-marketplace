import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Profile } from './profile'
import { Wallets } from './wallets'
import * as profileApi from '@/api/profile'
import * as walletsApi from '@/api/wallets'

vi.mock('@/api/profile')
vi.mock('@/api/wallets')
vi.mock('@/features/session/use-session', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } }, generation: 0 }),
}))
const user = {
  id: 'u1',
  username: 'teste',
  displayName: 'Teste',
  email: 'teste@example.com',
  version: 3,
}
function setup(component: React.ReactNode) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {component}
    </QueryClientProvider>,
  )
}
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
it('associa conflito do perfil ao campo e envia a versão', async () => {
  vi.mocked(profileApi.getProfile).mockResolvedValue(user)
  vi.mocked(profileApi.updateProfile).mockRejectedValue({
    code: 'CONFLICT',
    message: 'Conflito',
    fieldErrors: { email: ['E-mail já cadastrado'] },
    requestId: 'r1',
  })
  setup(<Profile />)
  const email = await screen.findByLabelText('E-mail')
  fireEvent.change(email, { target: { value: 'outro@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
  await waitFor(() =>
    expect(email).toHaveAccessibleDescription('E-mail já cadastrado'),
  )
  expect(email).toHaveAttribute('aria-invalid', 'true')
  expect(profileApi.updateProfile).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'outro@example.com', version: 3 }),
  )
})
it('impede salvar endereço incompatível com a rede e associa o erro ao campo', async () => {
  vi.mocked(walletsApi.getWallets).mockResolvedValue([])
  setup(<Wallets />)
  const button = await screen.findByRole('button', {
    name: 'Salvar carteira principal',
  })
  const form = within(button.closest('form')!)
  for (const label of [
    'Nome de exibição',
    'Apelido',
    'Nome do perfil',
    'Código de indicação',
    'Nome ENS',
  ])
    fireEvent.change(form.getByLabelText(label), { target: { value: 'teste' } })
  fireEvent.change(form.getByLabelText('E-mail'), {
    target: { value: 'teste@example.com' },
  })
  const address = form.getByLabelText('Endereço')
  fireEvent.change(address, {
    target: { value: '11111111111111111111111111111111' },
  })
  fireEvent.click(button)
  await waitFor(() =>
    expect(address).toHaveAccessibleDescription(
      'Endereço incompatível com a rede',
    ),
  )
  expect(address).toHaveAttribute('aria-invalid', 'true')
  expect(walletsApi.saveWallet).not.toHaveBeenCalled()
})
