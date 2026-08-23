export type PaymentTransactionStatus = 'INITIATED' | 'SUCCESS' | 'FAILED'

export interface PaymentTransaction {
  id: string
  userId: string
  checkoutSessionId: string
  amountSar: number
  status: PaymentTransactionStatus
  gatewayPaymentId: string | null
  createdAt: Date
  updatedAt: Date
}
