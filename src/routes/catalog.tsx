import { useSearch } from '@tanstack/react-router'
import { CatalogPreview } from '@/features/catalog/CatalogPreview'
import { Placeholder } from './placeholder'

export function Catalog() {
  const search = useSearch({ from: '/' })
  return (
    <>
      <Placeholder title="Catálogo" parameters={search} />
      <CatalogPreview />
    </>
  )
}
