export type PaymentMethodType =
  | 'mada'
  | 'apple_pay'
  | 'visa'
  | 'mastercard'
  | 'stc_pay'

export interface PaymentMethod {
  id: string
  userId: string
  type: PaymentMethodType
  label: string
  token: string
  isDefault: boolean
  isLastUsed: boolean
  createdAt: Date
  updatedAt: Date
}
