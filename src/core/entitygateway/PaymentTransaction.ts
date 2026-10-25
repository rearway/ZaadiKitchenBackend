import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../entities/PaymentTransaction.js'

export interface PaymentTransactionLoader {
  getTransactionById(id: string): Promise<PaymentTransaction | null>
  getTransactionsByStatus(
    status: PaymentTransactionStatus
  ): Promise<PaymentTransaction[]>
  getTransactionsByCheckoutSessionId(
    checkoutSessionId: string
  ): Promise<PaymentTransaction[]>
  getTransactionByGatewayPaymentId(
    gatewayPaymentId: string
  ): Promise<PaymentTransaction | null>
}

export interface PaymentTransactionPersistor {
  createTransaction(input: {
    userId: string
    checkoutSessionId: string
    amountSar: number
    status: PaymentTransactionStatus
    startDate?: string | null
    paymentMethodId?: string | null
  }): Promise<PaymentTransaction>

  updateTransaction(
    id: string,
    updates: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction>

  /** Returns true when this caller won the status transition. */
  compareAndSetStatus(
    id: string,
    from: PaymentTransactionStatus[],
    to: PaymentTransactionStatus
  ): Promise<boolean>
}
