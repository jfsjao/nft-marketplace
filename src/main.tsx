import './index.css'
import { holdRequestsUntil } from './mocks/ready'

// A interface pinta antes do worker: requisições e socket esperam o MSW (veja
// api/client e lib/socket), então o primeiro paint não depende dos mocks.
async function start() {
  const app = import('./bootstrap')
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const mocks = (async () => {
      const { worker } = await import('./mocks/browser')
      await worker.start({ onUnhandledRequest: 'bypass' })
      const { settle } = await import('./mocks/handlers/util')
      await settle()
    })()
    holdRequestsUntil(mocks)
    void mocks.catch(() => {})
  }
  const { mount } = await app
  mount()
}

const fail = () => {
  document.getElementById('root')!.innerHTML =
    '<p role="alert">Não foi possível iniciar a aplicação. Recarregue a página para tentar novamente.</p>'
}

// Deixa o navegador pintar o shell do index.html antes de carregar o app.
requestAnimationFrame(() => setTimeout(() => start().catch(fail)))
