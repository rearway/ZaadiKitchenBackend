import type { CheckoutSession } from '../../entities/CheckoutSession.js'
import { computePromotionAmounts, roundSar } from './planPromotionUtils.js'

export function needsGatewayCharge(totalDueSar: number): boolean {
  return Math.round(totalDueSar * 100) > 0
}

/** Recompute wallet credit and amount due from the user's current balance (matches checkout + promo rules). */
export function computeCheckoutWalletAndDue(
  session: CheckoutSession,
  walletBalanceSar: number
): { walletCreditSar: number; totalDueSar: number } {
  if (
    session.promotionSubscriptionId != null &&
    session.priorPlanCreditSar != null
  ) {
    const amounts = computePromotionAmounts({
      newPlanPriceSar: session.basePriceSar,
      priorPlanCreditSar: session.priorPlanCreditSar,
      walletBalanceSar,
    })
    const totalDueSar = roundSar(
      Math.max(0, amounts.totalDueSar - session.promoDiscountSar)
    )
    return {
      walletCreditSar: amounts.walletCreditSar,
      totalDueSar,
    }
  }

  const walletCreditSar = roundSar(
    Math.min(walletBalanceSar, session.basePriceSar)
  )
  const totalDueSar = roundSar(
    Math.max(
      0,
      session.basePriceSar - walletCreditSar - session.promoDiscountSar
    )
  )
  return { walletCreditSar, totalDueSar }
}

/** Apply a wallet refresh only when balance grew or the plan became fully wallet-funded. */
export function shouldRefreshCheckoutWallet(
  session: CheckoutSession,
  recomputed: { walletCreditSar: number; totalDueSar: number }
): boolean {
  if (recomputed.walletCreditSar > session.walletCreditSar) {
    return true
  }
  if (recomputed.totalDueSar < session.totalDueSar) {
    return true
  }
  return false
}
