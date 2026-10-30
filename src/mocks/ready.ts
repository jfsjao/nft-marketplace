let ready: Promise<void> = Promise.resolve()

export function holdRequestsUntil(promise: Promise<unknown>) {
  ready = promise.then(
    () => undefined,
    () => undefined,
  )
}

export function whenReady() {
  return ready
}
