import type { PaymentMethod } from '../../entities/PaymentMethod.js'
import { buildPaymentMethodLabel } from '../../constants/payment-method-label.js'
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

function displayLabel(method: PaymentMethod): string {
  if (!method.label.includes('0000')) return method.label
  return buildPaymentMethodLabel(method.type, method.token)
}

export function makeUC(deps: Deps) {
  return async function getPaymentMethods(
    input: GetPaymentMethodsInput
  ): Promise<GetPaymentMethodsOutput> {
    const methods = await deps.paymentMethodLoader.getMethodsByUserId(
      input.userId
    )
    return {
      payment_methods: methods.map(method => ({
        id: method.id,
        type: method.type,
        label: displayLabel(method),
        is_default: method.isDefault,
        is_last_used: method.isLastUsed,
      })),
    }
  }
}

export const name = 'GetPaymentMethods'
