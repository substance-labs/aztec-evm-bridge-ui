export const sleep = <T = null>(ms: number, res: T = null as T): Promise<T> =>
  new Promise<T>((resolve) =>
    setTimeout(() => {
      resolve(res)
    }, ms),
  )
