import { Deps } from '../../entitygateway/index.js'

export interface RemovePromoCodeInput {
  userId: string
  sessionId: string
}

export interface RemovePromoCodeOutput {
  session_id: string
  promo_code: null
  promo_discount_sar: number
  total_due_sar: number
}

export function makeUC(deps: Deps) {
  return async function removePromoCode(
    input: RemovePromoCodeInput
  ): Promise<RemovePromoCodeOutput> {
    const { logger, checkoutSessionLoader, checkoutSessionPersistor } = deps
    try {
      const { sessionId } = input

      const session = await checkoutSessionLoader.getSessionById(sessionId)
      if (
        !session ||
        session.status === 'expired' ||
        new Date() > session.expiresAt
      ) {
        const { SessionExpiredError } =
          await import('../../../shared/errors/index.js')
        throw new SessionExpiredError()
      }

      const newTotal = session.basePriceSar - session.walletCreditSar

      const updated = await checkoutSessionPersistor.updateSession(sessionId, {
        promoCode: null,
        promoDiscountSar: 0,
        totalDueSar: newTotal,
      })

      return {
        session_id: sessionId,
        promo_code: null,
        promo_discount_sar: 0,
        total_due_sar: updated.totalDueSar,
      }
    } catch (error) {
      logger.error(
        'Failed to remove promo code',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'RemovePromoCode'
