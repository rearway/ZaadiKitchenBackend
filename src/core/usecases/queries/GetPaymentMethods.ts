import { Deps } from '../../entitygateway/index.js'

export interface GetPaymentMethodsInput {
  userId: string
}

export interface GetPaymentMethodsOutput {
  payment_methods: Array<{
    id: string
    type: string
    label: string
    is_default: boolean
    is_last_used: boolean
  }>
}

export function makeUC(deps: Deps) {
  return async function getPaymentMethods(
    input: GetPaymentMethodsInput
  ): Promise<GetPaymentMethodsOutput> {
    const { logger, paymentMethodLoader } = deps
    try {
      const methods = await paymentMethodLoader.getMethodsByUserId(input.userId)
      return {
        payment_methods: methods.map(m => ({
          id: m.id,
          type: m.type,
          label: m.label,
          is_default: m.isDefault,
          is_last_used: m.isLastUsed,
        })),
      }
    } catch (error) {
      logger.error(
        'Failed to get payment methods',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetPaymentMethods'
