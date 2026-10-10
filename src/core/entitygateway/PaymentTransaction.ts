import { PaymentTransaction, PaymentTransactionStatus } from '../entities/PaymentTransaction.js'

export interface PaymentTransactionLoader {
  getTransactionById(id: string): Promise<PaymentTransaction | null>
  getTransactionsByStatus(status: PaymentTransactionStatus): Promise<PaymentTransaction[]>
}

export interface PaymentTransactionPersistor {
  createTransaction(input: {
    userId: string
    checkoutSessionId: string
    amountSar: number
    status: PaymentTransactionStatus
  }): Promise<PaymentTransaction>
  
  updateTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction>
}
