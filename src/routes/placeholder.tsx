export function Placeholder({
  title,
  parameters,
}: {
  title: string
  parameters?: Record<string, unknown>
}) {
  return (
    <section className="p-6">
      <h1>{title}</h1>
      {parameters && <pre>{JSON.stringify(parameters, null, 2)}</pre>}
    </section>
  )
}
