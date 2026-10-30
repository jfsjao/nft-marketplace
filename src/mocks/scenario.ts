import type { ApiErrorCode } from '@/domain/errors'
import type { ServerEvent } from '@/domain/events'
import type { Edition } from '@/domain/nft'
import { changeEdition } from './actions'
import { publish } from './realtime'
import { disconnectMockSockets, mockSocketClientCount } from './socket'

export interface Scenario {
  latency: 'none' | 'fast' | 'slow' | 'variable'
  failures: {
    route: string
    status: number
    code: ApiErrorCode
    times: number
  }[]
  clockOffsetMs: number
  sessionTtlMs: number
  event?: 'price-change' | 'sold-out'
  orderOutcome?: 'timeout' | 'declined'
  walletOutcome?: 'reject'
}

const defaults: Scenario = {
  latency: 'fast',
  failures: [],
  clockOffsetMs: 0,
  sessionTtlMs: 3_600_000,
}
export const presets = {
  default: defaults,
  slow: { ...defaults, latency: 'slow' },
  offline: {
    ...defaults,
    failures: [
      { route: '*', status: 0, code: 'SERVICE_UNAVAILABLE', times: -1 },
    ],
  },
  'server-error': {
    ...defaults,
    failures: [
      { route: '*', status: 503, code: 'SERVICE_UNAVAILABLE', times: -1 },
    ],
  },
  'session-expired': { ...defaults, sessionTtlMs: 0 },
  'price-change': { ...defaults, event: 'price-change' },
  'sold-out': { ...defaults, event: 'sold-out' },
  'order-timeout': { ...defaults, orderOutcome: 'timeout' },
  'payment-declined': { ...defaults, orderOutcome: 'declined' },
  'wallet-rejected': { ...defaults, walletOutcome: 'reject' },
} satisfies Record<string, Scenario>

const key = 'kurio:mock-scenario'
let scenario: Scenario = structuredClone(defaults)

export function getScenario(): Scenario {
  return structuredClone(scenario)
}
export function setScenario(
  value: keyof typeof presets | Partial<Scenario>,
): Scenario {
  scenario = structuredClone(
    typeof value === 'string' ? presets[value] : { ...scenario, ...value },
  )
  try {
    localStorage.setItem(key, JSON.stringify(scenario))
  } catch {
    /* Armazenamento indisponível: mantém em memória. */
  }
  return getScenario()
}
export function resetScenario(): Scenario {
  return setScenario('default')
}

try {
  const saved = JSON.parse(
    localStorage.getItem(key) ?? 'null',
  ) as Scenario | null
  if (
    saved &&
    ['none', 'fast', 'slow', 'variable'].includes(saved.latency) &&
    Array.isArray(saved.failures) &&
    Number.isFinite(saved.clockOffsetMs) &&
    Number.isFinite(saved.sessionTtlMs)
  )
    scenario = saved
} catch {
  /* Sem persistência válida, usa o padrão. */
}

if (typeof window !== 'undefined') {
  const preset = new URLSearchParams(window.location.search).get('scenario')
  if (preset && Object.hasOwn(presets, preset))
    setScenario(preset as keyof typeof presets)
  window.__kurioMock = {
    reset: async () => {
      resetScenario()
      await (await import('./db')).resetDb()
    },
    setScenario,
    getScenario,
    changeEdition,
    replayEvent: (event, eventId = event.eventId) =>
      publish({ ...event, eventId } as ServerEvent),
    disconnectSockets: disconnectMockSockets,
    connectedSockets: mockSocketClientCount,
  }
}

declare global {
  interface Window {
    __kurioMock: {
      reset: () => Promise<void>
      setScenario: typeof setScenario
      getScenario: typeof getScenario
      changeEdition: (
        nftId: string,
        editionId: string,
        patch: Partial<Pick<Edition, 'priceEth' | 'availableQuantity'>>,
      ) => Promise<Extract<ServerEvent, { type: 'nft.updated' }>>
      replayEvent: (event: ServerEvent, eventId?: string) => void
      disconnectSockets: () => void
      connectedSockets: () => number
    }
  }
}
