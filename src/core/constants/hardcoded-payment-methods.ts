import type { PaymentMethodType } from '../entities/PaymentMethod.js'

export interface HardcodedPaymentMethod {
  id: string
  type: PaymentMethodType
  label: string
  isDefault: boolean
}

export const HARDCODED_PAYMENT_METHODS: HardcodedPaymentMethod[] = [
  { id: '00000000-0000-0000-0000-000000000001', type: 'mada', label: 'Mada', isDefault: true },
  { id: '00000000-0000-0000-0000-000000000002', type: 'visa', label: 'Visa', isDefault: false },
  { id: '00000000-0000-0000-0000-000000000003', type: 'apple_pay', label: 'Apple Pay', isDefault: false },
]

export const HARDCODED_METHOD_IDS = new Set(
  HARDCODED_PAYMENT_METHODS.map(m => m.id)
)

export function findHardcodedMethod(id: string): HardcodedPaymentMethod | undefined {
  return HARDCODED_PAYMENT_METHODS.find(m => m.id === id)
}
