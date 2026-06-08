import { HARDCODED_PAYMENT_METHODS } from '../../constants/hardcoded-payment-methods.js'
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

export function makeUC(_deps: Deps) {
  return async function getPaymentMethods(
    _input: GetPaymentMethodsInput
  ): Promise<GetPaymentMethodsOutput> {
    return {
      payment_methods: HARDCODED_PAYMENT_METHODS.map(m => ({
        id: m.id,
        type: m.type,
        label: m.label,
        is_default: m.isDefault,
        is_last_used: false,
      })),
    }
  }
}

export const name = 'GetPaymentMethods'
