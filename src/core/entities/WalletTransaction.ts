export type WalletTransactionType = 'credit' | 'debit'

export interface WalletTransaction {
  id: string
  userId: string
  type: WalletTransactionType
  amountSar: number
  label: string
  description: string | null
  referenceId: string | null
  createdAt: Date
  updatedAt: Date
}
