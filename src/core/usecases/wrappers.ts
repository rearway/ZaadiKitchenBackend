import { Deps } from '../entitygateway'

type AnyFunction = (...args: any[]) => Promise<any>

export function wrapUC<T extends AnyFunction>(
  deps: Deps,
  uc: T,
  name: string,
  ...wrappers: Array<(deps: Deps, uc: T, name: string) => T>
): T {
  let wrapped = uc
  for (const wrapper of wrappers) {
    wrapped = wrapper(deps, wrapped, name)
  }
  return wrapped
}

export function withLogging<T extends AnyFunction>(
  deps: Deps,
  uc: T,
  name: string
): T {
  const { logger } = deps
  return (async (...args: any[]) => {
    logger.log(`[UC:${name}] started`)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await uc(...args)
      logger.log(`[UC:${name}] completed`)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result
    } catch (error) {
      logger.error(
        `[UC:${name}] failed`,
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }) as T
}

export const defaultWrappers = [withLogging]
