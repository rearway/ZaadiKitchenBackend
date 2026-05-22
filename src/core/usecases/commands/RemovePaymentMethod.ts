import { Deps } from '../../entitygateway/index.js'

export interface RemovePaymentMethodInput {
  userId: string
  methodId: string
}

export type RemovePaymentMethodOutput = void

export function makeUC(deps: Deps) {
  return async function removePaymentMethod(
    input: RemovePaymentMethodInput
  ): Promise<RemovePaymentMethodOutput> {
    const { logger, paymentMethodLoader, paymentMethodPersistor } = deps
    try {
      const method = await paymentMethodLoader.getMethodById(input.methodId)
      if (!method || method.userId !== input.userId) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Payment method', input.methodId)
      }
      await paymentMethodPersistor.deleteMethod(input.methodId)
    } catch (error) {
      logger.error(
        'Failed to remove payment method',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'RemovePaymentMethod'
