import { Deps } from '../../entitygateway/index.js'
import type { CheckoutSession, MealType } from '../../entities/CheckoutSession.js'
import type { Plan } from '../../entities/Plan.js'
import type { Order } from '../../entities/Order.js'
import { findHardcodedMethod } from '../../constants/hardcoded-payment-methods.js'
import { promoteSubscriptionInPlace } from './PromoteSubscription.js'

export interface CreateOrderInput {
  userId: string
  sessionId: string
  paymentMethodId: string
  startDate: string
}

export interface CreateOrderOutput {
  order_id: string
  subscription_id: string
  status: string
  is_new_user: boolean
  plan_id: string
  meal_type: string
  meal_count: number
  start_date: string
  first_delivery_label: string
  summary: {
    plan_price_sar: number
    wallet_credit_sar: number
    promo_discount_sar: number
    promo_code: string | null
    discount_label: string | null
    total_paid_sar: number
  }
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isWorkingDay(date: Date): boolean {
  const dow = date.getDay()
  return dow >= 0 && dow <= 4
}

function formatDeliveryLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]}`
}

function walletDebitLabelForNewPurchase(planName: string, startDate: string): string {
  return `${planName} · ${new Date(startDate).toLocaleString('en', { month: 'short', year: 'numeric' })}`
}

async function resolvePromoDiscountLabel(
  session: CheckoutSession,
  promoCodeLoader: Deps['promoCodeLoader']
): Promise<string | null> {
  if (!session.promoCode) return null
  const promo = await promoCodeLoader.getPromoByCode(session.promoCode)
  return promo?.type === 'referral' ? 'Referral discount' : 'Promo discount'
}

function resolvePromotionDiscountLabel(priorCredit: number): string {
  return priorCredit > 0
    ? `Plan upgrade credit (SAR ${priorCredit})`
    : 'Plan upgrade'
}

type ResolvedPaymentMethod = {
  type: string
  label: string
  token: string
}

function buildConfirmedOrderInput(
  ctx: {
    userId: string
    plan: Plan
    session: CheckoutSession
    paymentMethodId: string
    hardcoded: boolean
    resolvedMethod: ResolvedPaymentMethod
    gatewayPaymentId: string | undefined
    subscriptionId: string | null
    startDate: string
    discountLabel: string | null
    isNewUser: boolean
  }
): Omit<Order, 'id' | 'createdAt' | 'updatedAt'> {
  const {
    userId,
    plan,
    session,
    paymentMethodId,
    hardcoded,
    resolvedMethod,
    gatewayPaymentId,
    subscriptionId,
    startDate,
    discountLabel,
    isNewUser,
  } = ctx
  return {
    userId,
    subscriptionId,
    planId: plan.id,
    paymentMethodId: hardcoded ? null : paymentMethodId,
    mealType: session.mealType,
    mealCount: plan.mealCount,
    startDate,
    planPriceSar: session.basePriceSar,
    walletCreditSar: session.walletCreditSar,
    promoDiscountSar: session.promoDiscountSar,
    promoCode: session.promoCode ?? null,
    discountLabel,
    totalPaidSar: session.totalDueSar,
    paymentMethodType: resolvedMethod.type,
    paymentMethodLabel: resolvedMethod.label,
    gatewayPaymentId: gatewayPaymentId ?? null,
    status: 'confirmed',
    isNewUser,
  }
}

function toCreateOrderOutput(
  orderId: string,
  subscriptionId: string,
  isNewUser: boolean,
  plan: Plan,
  session: CheckoutSession,
  startDate: string,
  discountLabel: string | null
): CreateOrderOutput {
  return {
    order_id: orderId,
    subscription_id: subscriptionId,
    status: 'confirmed',
    is_new_user: isNewUser,
    plan_id: plan.slug,
    meal_type: session.mealType,
    meal_count: plan.mealCount,
    start_date: startDate,
    first_delivery_label: formatDeliveryLabel(startDate),
    summary: {
      plan_price_sar: session.basePriceSar,
      wallet_credit_sar: session.walletCreditSar,
      promo_discount_sar: session.promoDiscountSar,
      promo_code: session.promoCode ?? null,
      discount_label: discountLabel,
      total_paid_sar: session.totalDueSar,
    },
  }
}

async function finalizePaidCheckout(
  deps: Pick<
    Deps,
    | 'checkoutSessionPersistor'
    | 'paymentMethodPersistor'
    | 'walletPersistor'
  >,
  input: {
    sessionId: string
    userId: string
    paymentMethodId: string
    hardcoded: boolean
    walletCreditSar: number
    walletDebitLabel: string
    walletDescription: string
    orderId: string
  }
): Promise<void> {
  await deps.checkoutSessionPersistor.updateSession(input.sessionId, {
    status: 'confirmed',
  })
  if (!input.hardcoded) {
    await deps.paymentMethodPersistor.markAsLastUsed(
      input.paymentMethodId,
      input.userId
    )
  }
  if (input.walletCreditSar > 0) {
    await deps.walletPersistor.createTransaction({
      userId: input.userId,
      type: 'debit',
      amountSar: -input.walletCreditSar,
      label: input.walletDebitLabel,
      description: input.walletDescription,
      referenceId: input.orderId,
    })
  }
}

async function applyReferralRewardIfEligible(
  deps: Pick<
    Deps,
    | 'promoCodeLoader'
    | 'promoCodePersistor'
    | 'walletPersistor'
    | 'referralPersistor'
    | 'commsLoader'
    | 'walletLoader'
    | 'userDeviceLoader'
    | 'notificationGateway'
    | 'logger'
  >,
  input: {
    userId: string
    session: CheckoutSession
    plan: Plan
    orderId: string
  }
): Promise<void> {
  if (!input.session.promoCode) return
  const promo = await deps.promoCodeLoader.getPromoByCode(input.session.promoCode)
  if (promo?.type !== 'referral' || !promo.ownerUserId) return

  const rewardSar = Math.round(input.plan.priceSar * 0.1)

  await deps.promoCodePersistor.incrementTimesUsed(promo.id)

  await deps.walletPersistor.createTransaction({
    userId: promo.ownerUserId,
    type: 'credit',
    amountSar: rewardSar,
    label: 'Referral reward',
    description: `10% of SAR ${input.plan.priceSar}`,
    referenceId: input.orderId,
  })

  await deps.referralPersistor.createReferral({
    referrerUserId: promo.ownerUserId,
    referredUserId: input.userId,
    referralCode: input.session.promoCode,
    rewardCreditedSar: rewardSar,
    isRewarded: true,
  })

  try {
    const enabled = await deps.commsLoader.isAutomationEnabled('referral_reward')
    if (!enabled) return
    const balance = await deps.walletLoader.getBalanceByUserId(promo.ownerUserId)
    const devices = await deps.userDeviceLoader.getDevicesByUserId(promo.ownerUserId)
    await Promise.allSettled(
      devices.map(device =>
        deps.notificationGateway.sendSingleNotification(
          device.endpointArn,
          'Referral Reward 🎁',
          `Your friend subscribed! SAR ${rewardSar} has been credited to your wallet. New balance: SAR ${balance}.`,
          { type: 'referral_reward' }
        )
      )
    )
  } catch (notifyError) {
    deps.logger.error(
      'Failed to send Referral Reward push notification',
      String(notifyError)
    )
  }
}

function generateDeliveryDays(
  startDate: string,
  mealCount: number,
  mealType: MealType,
  subscriptionId: string,
  userId: string,
  holidaySet: Set<string>
): Array<{
  subscriptionId: string
  userId: string
  date: string
  mealType: MealType
  mealName: null
  status: 'scheduled'
  deliveredAt: null
}> {
  const days: Array<{
    subscriptionId: string
    userId: string
    date: string
    mealType: MealType
    mealName: null
    status: 'scheduled'
    deliveredAt: null
  }> = []
  let cursor = new Date(startDate + 'T00:00:00Z')
  let maxIterations = 500

  while (days.length < mealCount && maxIterations-- > 0) {
    const dateStr = toYYYYMMDD(cursor)
    if (isWorkingDay(cursor) && !holidaySet.has(dateStr)) {
      days.push({
        subscriptionId,
        userId,
        date: dateStr,
        mealType,
        mealName: null,
        status: 'scheduled',
        deliveredAt: null,
      })
    }
    cursor = addDays(cursor, 1)
  }

  return days
}

export function makeUC(deps: Deps) {
  return async function createOrder(
    input: CreateOrderInput
  ): Promise<CreateOrderOutput> {
    const { logger } = deps

    try {
      const { userId, sessionId, paymentMethodId, startDate } = input

      // Load and validate session
      const session = await deps.checkoutSessionLoader.getSessionById(sessionId)
      if (
        !session ||
        session.status === 'expired' ||
        new Date() > session.expiresAt
      ) {
        const { SessionExpiredError } =
          await import('../../../shared/errors/index.js')
        throw new SessionExpiredError(
          'Your 10-minute checkout session has expired. Your plan selection is saved — just start checkout again.'
        )
      }

      // Resolve payment method — hardcoded methods take priority over DB
      const hardcoded = findHardcodedMethod(paymentMethodId)
      let resolvedMethod: ResolvedPaymentMethod & { id: string }

      if (hardcoded) {
        resolvedMethod = {
          id: hardcoded.id,
          type: hardcoded.type,
          label: hardcoded.label,
          token: 'mock_token',
        }
      } else {
        const dbMethod =
          await deps.paymentMethodLoader.getMethodById(paymentMethodId)
        if (!dbMethod || dbMethod.userId !== userId) {
          const { ResourceNotFoundError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceNotFoundError('Payment method', paymentMethodId)
        }
        resolvedMethod = {
          id: dbMethod.id,
          type: dbMethod.type,
          label: dbMethod.label,
          token: dbMethod.token,
        }
      }

      const plan = await deps.planLoader.getPlanById(session.planId)
      if (!plan) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Plan', session.planId)
      }

      const lastOrder = await deps.orderLoader.getLastOrderByUserId(userId)
      const isNewUser = !lastOrder
      const promoDiscountLabel = await resolvePromoDiscountLabel(
        session,
        deps.promoCodeLoader
      )

      const paymentTx = await deps.paymentTransactionPersistor.createTransaction({
        userId,
        checkoutSessionId: sessionId,
        amountSar: session.totalDueSar,
        status: 'INITIATED',
      })

      const chargeResult = await deps.paymentGateway.charge({
        amountSar: session.totalDueSar,
        paymentToken: resolvedMethod.token,
        orderId: paymentTx.id,
        description: `${plan.name} · ${startDate}`,
      })

      if (!chargeResult.success) {
        await deps.paymentTransactionPersistor.updateTransaction(paymentTx.id, {
          status: 'FAILED',
          gatewayPaymentId: chargeResult.gatewayPaymentId || null,
        })
        const { PaymentFailedError } =
          await import('../../../shared/errors/index.js')
        throw new PaymentFailedError(
          chargeResult.errorMessage ?? 'Payment could not be processed.'
        )
      }

      await deps.paymentTransactionPersistor.updateTransaction(paymentTx.id, {
        status: 'SUCCESS',
        gatewayPaymentId: chargeResult.gatewayPaymentId,
      })

      const gatewayPaymentId = chargeResult.gatewayPaymentId
      const promotionSubscriptionId = session.promotionSubscriptionId ?? null

      if (promotionSubscriptionId) {
        const subscription =
          await deps.subscriptionLoader.getSubscriptionById(
            promotionSubscriptionId
          )
        if (!subscription || subscription.userId !== userId) {
          const { ResourceNotFoundError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceNotFoundError('Subscription', promotionSubscriptionId)
        }

        const effectiveStartDate = subscription.startDate
        const promotionDiscountLabel = resolvePromotionDiscountLabel(
          session.priorPlanCreditSar ?? 0
        )

        const order = await deps.orderPersistor.createOrder(
          buildConfirmedOrderInput({
            userId,
            plan,
            session,
            paymentMethodId,
            hardcoded: !!hardcoded,
            resolvedMethod,
            gatewayPaymentId,
            subscriptionId: subscription.id,
            startDate: effectiveStartDate,
            discountLabel: promotionDiscountLabel,
            isNewUser: false,
          })
        )

        const { subscription: updatedSub } = await promoteSubscriptionInPlace(
          deps,
          {
            userId,
            subscription,
            newPlan: plan,
            mealType: session.mealType,
          }
        )

        await deps.subscriptionPersistor.updateSubscription(updatedSub.id, {
          orderId: order.id,
        })

        await finalizePaidCheckout(deps, {
          sessionId,
          userId,
          paymentMethodId,
          hardcoded: !!hardcoded,
          walletCreditSar: session.walletCreditSar,
          walletDebitLabel: `${plan.name} upgrade`,
          walletDescription: effectiveStartDate,
          orderId: order.id,
        })

        return toCreateOrderOutput(
          order.id,
          updatedSub.id,
          false,
          plan,
          session,
          effectiveStartDate,
          promotionDiscountLabel
        )
      }

      const order = await deps.orderPersistor.createOrder(
        buildConfirmedOrderInput({
          userId,
          plan,
          session,
          paymentMethodId,
          hardcoded: !!hardcoded,
          resolvedMethod,
          gatewayPaymentId,
          subscriptionId: null,
          startDate,
          discountLabel: promoDiscountLabel,
          isNewUser,
        })
      )

      const fromStr = startDate
      const toDate = addDays(new Date(startDate + 'T00:00:00Z'), 400)
      const toStr = toYYYYMMDD(toDate)
      const holidayDates = new Set(
        await deps.publicHolidayLoader.getHolidayDates(fromStr, toStr)
      )

      const subscription = await deps.subscriptionPersistor.createSubscription({
        userId,
        orderId: order.id,
        planId: plan.id,
        mealType: session.mealType,
        status: 'active',
        totalMealDays: plan.mealCount,
        deliveredCount: 0,
        skippedCount: 0,
        startDate,
        endDate: startDate,
        skipDaysAllowed: plan.skipDaysAllowed,
        skipDaysUsed: 0,
        pauseDaysAllowed: plan.pauseDaysAllowed,
        pauseDaysUsed: 0,
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
      })

      const dayInputs = generateDeliveryDays(
        startDate,
        plan.mealCount,
        session.mealType,
        subscription.id,
        userId,
        holidayDates
      )
      const deliveryDays =
        await deps.deliveryDayPersistor.bulkCreateDeliveryDays(dayInputs)

      const lastDeliveryDate =
        deliveryDays[deliveryDays.length - 1]?.date ?? startDate

      await deps.subscriptionPersistor.updateSubscription(subscription.id, {
        endDate: lastDeliveryDate,
      })
      await deps.orderPersistor.updateOrder(order.id, {
        subscriptionId: subscription.id,
      })

      await finalizePaidCheckout(deps, {
        sessionId,
        userId,
        paymentMethodId,
        hardcoded: !!hardcoded,
        walletCreditSar: session.walletCreditSar,
        walletDebitLabel: walletDebitLabelForNewPurchase(plan.name, startDate),
        walletDescription: startDate,
        orderId: order.id,
      })

      await applyReferralRewardIfEligible(deps, {
        userId,
        session,
        plan,
        orderId: order.id,
      })

      return toCreateOrderOutput(
        order.id,
        subscription.id,
        isNewUser,
        plan,
        session,
        startDate,
        promoDiscountLabel
      )
    } catch (error) {
      logger.error(
        'Failed to create order',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateOrder'
