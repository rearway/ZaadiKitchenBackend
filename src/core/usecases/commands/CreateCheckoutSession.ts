import { Deps } from '../../entitygateway/index.js'
import { MealType } from '../../entities/index.js'
import {
  assertCanPromote,
  computePromotionAmounts,
  normalizePlanSlug,
} from '../services/planPromotionUtils.js'

export interface CreateCheckoutSessionInput {
  userId: string
  planId: string
  mealType: MealType
}

export interface CreateCheckoutSessionOutput {
  session_id: string
  plan_id: string
  meal_type: string
  base_price_sar: number
  wallet_credit_sar: number
  promo_discount_sar: number
  total_due_sar: number
  promo_code: string | null
  promo_attempt_count: number
  promo_locked: boolean
  expires_at: string
  promotion: boolean
  prior_plan_credit_sar: number | null
  current_plan_id: string | null
}

export function makeUC(deps: Deps) {
  return async function createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionOutput> {
    const {
      logger,
      planLoader,
      walletLoader,
      checkoutSessionPersistor,
      subscriptionLoader,
      orderLoader,
    } = deps
    try {
      const { userId, planId, mealType } = input

      const plan = await planLoader.getPlanBySlug(planId)
      if (!plan || !plan.isActive) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Plan', planId)
      }

      const existingSub =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)

      let promotionSubscriptionId: string | null = null
      let priorPlanCreditSar: number | null = null
      let currentPlanId: string | null = null
      let isPromotion = false
      let basePriceSar = plan.priceSar

      if (existingSub) {
        if (existingSub.status !== 'active') {
          const { ActiveSubscriptionCheckoutBlockedError } =
            await import('../../../shared/errors/index.js')
          throw new ActiveSubscriptionCheckoutBlockedError(
            'Checkout is only available for plan upgrades while your subscription is active, or after your plan has expired.'
          )
        }

        const currentPlan = await planLoader.getPlanById(existingSub.planId)
        if (!currentPlan) {
          const { ResourceNotFoundError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceNotFoundError('Plan', existingSub.planId)
        }

        currentPlanId = currentPlan.slug
        assertCanPromote(currentPlan.slug, planId)

        const priorOrder = await orderLoader.getOrderById(existingSub.orderId)
        if (!priorOrder) {
          const { ResourceNotFoundError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceNotFoundError('Order', existingSub.orderId)
        }

        isPromotion = true
        promotionSubscriptionId = existingSub.id
        priorPlanCreditSar = Number(priorOrder.totalPaidSar)
        basePriceSar = plan.priceSar
      }

      const walletBalance = await walletLoader.getBalanceByUserId(userId)

      let walletCreditSar: number
      let totalDueSar: number

      if (isPromotion && priorPlanCreditSar != null) {
        const amounts = computePromotionAmounts({
          newPlanPriceSar: plan.priceSar,
          priorPlanCreditSar,
          walletBalanceSar: walletBalance,
        })
        priorPlanCreditSar = amounts.priorPlanCreditSar
        walletCreditSar = amounts.walletCreditSar
        totalDueSar = amounts.totalDueSar
      } else {
        walletCreditSar = Math.min(walletBalance, plan.priceSar)
        totalDueSar = plan.priceSar - walletCreditSar
      }

      await checkoutSessionPersistor.expireAllUserSessions(userId)

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      const session = await checkoutSessionPersistor.createSession({
        userId,
        planId: plan.id,
        mealType,
        basePriceSar,
        walletCreditSar,
        promoDiscountSar: 0,
        totalDueSar,
        promoCode: null,
        promoAttemptCount: 0,
        promoLocked: false,
        status: 'active',
        expiresAt,
        promotionSubscriptionId,
        priorPlanCreditSar,
      })

      return {
        session_id: session.id,
        plan_id: normalizePlanSlug(planId),
        meal_type: session.mealType,
        base_price_sar: session.basePriceSar,
        wallet_credit_sar: session.walletCreditSar,
        promo_discount_sar: session.promoDiscountSar,
        total_due_sar: session.totalDueSar,
        promo_code: session.promoCode ?? null,
        promo_attempt_count: session.promoAttemptCount,
        promo_locked: session.promoLocked,
        expires_at: session.expiresAt.toISOString(),
        promotion: isPromotion,
        prior_plan_credit_sar: priorPlanCreditSar,
        current_plan_id: currentPlanId,
      }
    } catch (error) {
      logger.error(
        'Failed to create checkout session',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateCheckoutSession'
