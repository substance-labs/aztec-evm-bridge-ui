import { useRef } from "react"

type DeferredPromise<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: string | null) => void
}

export function createDeferred<T>(): DeferredPromise<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: string | null) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

export function useDeferred<T>() {
  const deferredRef = useRef<DeferredPromise<T> | null>(null)

  const get = () => {
    if (!deferredRef.current) {
      deferredRef.current = createDeferred<T>()
    }
    return deferredRef.current
  }

  const reset = () => {
    deferredRef.current = createDeferred<T>()
  }

  return { get, reset }
}
