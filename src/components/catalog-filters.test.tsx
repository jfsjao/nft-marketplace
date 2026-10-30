import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CatalogFilters } from './catalog-filters'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('no mobile prende o foco, fecha com Escape e devolve o foco ao gatilho', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  const user = userEvent.setup()
  render(
    <CatalogFilters>
      <label>
        <input type="checkbox" />
        Ethereum
      </label>
    </CatalogFilters>,
  )
  const trigger = screen.getByRole('button', { name: 'Filtros' })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Filtros do catálogo' })
  const checkbox = within(dialog).getByRole('checkbox')
  expect(checkbox).toHaveFocus()
  await user.tab({ shift: true })
  expect(
    within(dialog).getByRole('button', { name: 'Ver resultados' }),
  ).toHaveFocus()
  await user.tab()
  expect(checkbox).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('no desktop mantém os filtros visíveis na barra lateral', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  render(
    <CatalogFilters>
      <label>
        <input type="checkbox" />
        Ethereum
      </label>
    </CatalogFilters>,
  )
  expect(
    within(screen.getByRole('complementary')).getByRole('checkbox', {
      name: 'Ethereum',
    }),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Filtros' }),
  ).not.toBeInTheDocument()
})
