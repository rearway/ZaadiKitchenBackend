import { Deps } from '../../entitygateway/index.js'
import { PaymentMethodType } from '../../entities/index.js'

export interface AddPaymentMethodInput {
  userId: string
  type: PaymentMethodType
  token: string
}

export interface AddPaymentMethodOutput {
  id: string
  type: string
  label: string
  is_default: boolean
  is_last_used: boolean
}

function buildLabel(type: PaymentMethodType, _token: string): string {
  const last4 = '0000'
  switch (type) {
    case 'mada':
      return `Mada ····${last4}`
    case 'visa':
      return `Visa ····${last4}`
    case 'mastercard':
      return `Mastercard ····${last4}`
    case 'stc_pay':
      return 'STC Pay'
    case 'apple_pay':
      return 'Apple Pay'
    default:
      return type
  }
}

export function makeUC(deps: Deps) {
  return async function addPaymentMethod(
    input: AddPaymentMethodInput
  ): Promise<AddPaymentMethodOutput> {
    const { logger, paymentMethodPersistor } = deps
    try {
      const { userId, type, token } = input
      const label = buildLabel(type, token)

      const method = await paymentMethodPersistor.createMethod({
        userId,
        type,
        label,
        token,
        isDefault: false,
        isLastUsed: false,
      })

      return {
        id: method.id,
        type: method.type,
        label: method.label,
        is_default: method.isDefault,
        is_last_used: method.isLastUsed,
      }
    } catch (error) {
      logger.error(
        'Failed to add payment method',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'AddPaymentMethod'
