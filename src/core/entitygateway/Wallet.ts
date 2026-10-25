import type { WalletTransaction } from '../entities/WalletTransaction.js'

export interface WalletLoader {
  getBalanceByUserId(userId: string): Promise<number>
  getTransactionsByUserId(
    userId: string,
    pagination: { page: number; perPage: number }
  ): Promise<{ transactions: WalletTransaction[]; total: number }>
}

export interface WalletPersistor {
  createTransaction(
    input: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WalletTransaction>
  /**
   * Insert a debit only when the locked balance still covers it.
   * A debit with the same user and referenceId is returned unchanged.
   */
  createDebitIfSufficient(
    input: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WalletTransaction>
}
