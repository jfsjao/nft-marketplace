import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AsyncState } from './async-state'

it('mostra carregamento, erro com nova tentativa e vazio', () => {
  const refetch = vi.fn()
  const { rerender, unmount } = render(
    <AsyncState
      query={{ isPending: true, isError: false, refetch }}
      loading="Carregando"
    />,
  )
  expect(screen.getByLabelText('Carregando')).toHaveClass('animate-shimmer')
  rerender(<AsyncState isError refetch={refetch} error="Falhou" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Falhou')
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(refetch).toHaveBeenCalledOnce()
  rerender(<AsyncState empty emptyMessage="Nada encontrado" />)
  expect(screen.getByText('Nada encontrado')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  rerender(<AsyncState />)
  expect(screen.queryByText('Nada encontrado')).not.toBeInTheDocument()
  unmount()
})

it('reserva a grade do catálogo e a estrutura do detalhe durante o carregamento', () => {
  const { rerender, unmount } = render(
    <AsyncState isPending loading="Carregando catálogo" layout="catalog" />,
  )
  const catalog = screen.getByLabelText('Carregando catálogo')
  expect(catalog).toHaveClass('grid-cols-2', 'lg:grid-cols-3')
  expect(catalog.querySelectorAll('.aspect-square')).toHaveLength(9)
  rerender(<AsyncState isPending loading="Carregando NFT" layout="detail" />)
  expect(screen.getByLabelText('Carregando NFT')).toHaveClass('md:grid-cols-2')
  expect(
    screen.getByLabelText('Carregando NFT').querySelector('.aspect-square'),
  ).toBeInTheDocument()
  unmount()
})
