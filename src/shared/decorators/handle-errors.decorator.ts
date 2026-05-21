import { HttpException } from '@nestjs/common'
import { BaseError } from '../../shared/errors'

export function HandleErrors(operation: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>

    descriptor.value = async function (...args: unknown[]) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await originalMethod.apply(this, args)
      } catch (error) {
        if (error instanceof BaseError) {
          throw new HttpException(
            {
              statusCode: error.statusCode,
              errorCode: error.errorCode,
              message: error.message,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              details: error.details,
              operation,
            },
            error.statusCode
          )
        }

        if (error instanceof HttpException) {
          throw error
        }

        throw new HttpException(
          {
            statusCode: 500,
            errorCode: 'INTERNAL_ERROR',
            message: `An unexpected error occurred during ${operation}`,
            operation,
          },
          500
        )
      }
    }

    return descriptor
  }
}
