import { Deps } from '../../entitygateway/index.js'

export interface ApplyPromoCodeInput {
  userId: string
  sessionId: string
  code: string
}

export interface ApplyPromoCodeOutput {
  session_id: string
  promo_code: string
  discount_type: string
  promo_discount_sar: number
  total_due_sar: number
  promo_attempt_count: number
  promo_locked: boolean
}

export function makeUC(deps: Deps) {
  return async function applyPromoCode(
    input: ApplyPromoCodeInput
  ): Promise<ApplyPromoCodeOutput> {
    const {
      logger,
      checkoutSessionLoader,
      checkoutSessionPersistor,
      promoCodeLoader,
      orderLoader,
      planLoader,
    } = deps
    try {
      const { sessionId, code, userId } = input

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

      if (session.promoLocked) {
        const { PromoLockedError } =
          await import('../../../shared/errors/index.js')
        throw new PromoLockedError({
          promo_attempt_count: session.promoAttemptCount,
        })
      }

      const promo = await promoCodeLoader.getPromoByCode(code)

      if (
        !promo ||
        !promo.isActive ||
        (promo.maxUses !== null && promo.timesUsed >= promo.maxUses)
      ) {
        const newAttempts = session.promoAttemptCount + 1
        const locked = newAttempts >= 5
        await checkoutSessionPersistor.updateSession(sessionId, {
          promoAttemptCount: newAttempts,
          promoLocked: locked,
        })
        if (locked) {
          const { PromoLockedError } =
            await import('../../../shared/errors/index.js')
          throw new PromoLockedError({ promo_attempt_count: newAttempts })
        }
        const { InvalidCodeError } =
          await import('../../../shared/errors/index.js')
        throw new InvalidCodeError(undefined, {
          promo_attempt_count: newAttempts,
          promo_locked: false,
        })
      }

      // Validate plan match if scoped
      const plan = await planLoader.getPlanById(session.planId)
      if (
        promo.validForPlanSlug &&
        plan &&
        promo.validForPlanSlug !== plan.slug
      ) {
        const newAttempts = session.promoAttemptCount + 1
        const locked = newAttempts >= 5
        await checkoutSessionPersistor.updateSession(sessionId, {
          promoAttemptCount: newAttempts,
          promoLocked: locked,
        })
        const { PlanMismatchError } =
          await import('../../../shared/errors/index.js')
        throw new PlanMismatchError()
      }

      // Referral codes only for new users
      if (promo.type === 'referral') {
        const lastOrder = await orderLoader.getLastOrderByUserId(userId)
        if (lastOrder) {
          const { NotNewUserError } =
            await import('../../../shared/errors/index.js')
          throw new NotNewUserError()
        }
      }

      // For referral codes the discount is 20% of the plan price, computed
      // dynamically so the correct amount applies regardless of which plan
      // the user selected. For promo codes, use the fixed SAR from the record.
      const discountSar =
        promo.type === 'referral' && plan
          ? Math.round(plan.priceSar * 0.2)
          : promo.discountSar

      const newTotal = Math.max(
        0,
        session.basePriceSar - session.walletCreditSar - discountSar
      )

      const updated = await checkoutSessionPersistor.updateSession(sessionId, {
        promoCode: code,
        promoDiscountSar: discountSar,
        totalDueSar: newTotal,
      })

      return {
        session_id: sessionId,
        promo_code: code,
        discount_type: promo.type,
        promo_discount_sar: discountSar,
        total_due_sar: updated.totalDueSar,
        promo_attempt_count: updated.promoAttemptCount,
        promo_locked: updated.promoLocked,
      }
    } catch (error) {
      logger.error(
        'Failed to apply promo code',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ApplyPromoCode'
