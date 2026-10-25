/** Moyasar `authorized` only reserves funds. Subscriptions settle on paid or captured. */
export function isSettledPaymentStatus(
  status: string | null | undefined
): boolean {
  return status === 'paid' || status === 'captured'
}

export function walletCoversDebit(
  balanceSar: number,
  debitSar: number
): boolean {
  return Math.round(balanceSar * 100) >= Math.round(Math.abs(debitSar) * 100)
}
