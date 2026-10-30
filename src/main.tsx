import './index.css'

// O app (e o socket.io-client) só carrega depois do MSW: o cliente guarda o
// WebSocket global no import, e o mock precisa ter trocado ele antes.
async function start() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
    const { settle } = await import('./mocks/handlers/util')
    await settle()
  }
  const { mount } = await import('./bootstrap')
  mount()
}

start().catch(() => {
  document.getElementById('root')!.innerHTML =
    '<p role="alert">Não foi possível iniciar a aplicação. Recarregue a página para tentar novamente.</p>'
})
