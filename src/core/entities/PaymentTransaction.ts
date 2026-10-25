export type PaymentTransactionStatus =
  | 'INITIATED'
  | 'PAID_UNFULFILLED'
  | 'FULFILLING'
  | 'SUCCESS'
  | 'FAILED'

export interface PaymentTransaction {
  id: string
  userId: string
  checkoutSessionId: string
  amountSar: number
  status: PaymentTransactionStatus
  gatewayPaymentId: string | null
  /** Delivery start date captured before charge so reconcile can finish the subscription. */
  startDate: string | null
  paymentMethodId: string | null
  createdAt: Date
  updatedAt: Date
}
