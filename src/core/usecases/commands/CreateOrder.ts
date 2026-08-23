import crypto from 'crypto'
import { Deps } from '../../entitygateway/index.js'
import { findHardcodedMethod } from '../../constants/hardcoded-payment-methods.js'

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

function generateDeliveryDays(
  startDate: string,
  mealCount: number,
  mealType: 'executive' | 'salad',
  subscriptionId: string,
  userId: string,
  holidaySet: Set<string>
): Array<{
  subscriptionId: string
  userId: string
  date: string
  mealType: 'executive' | 'salad'
  mealName: null
  status: 'scheduled'
  deliveredAt: null
}> {
  const days: Array<{
    subscriptionId: string
    userId: string
    date: string
    mealType: 'executive' | 'salad'
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
    const {
      logger,
      checkoutSessionLoader,
      checkoutSessionPersistor,
      paymentMethodLoader,
      paymentMethodPersistor,
      planLoader,
      orderLoader,
      orderPersistor,
      subscriptionPersistor,
      deliveryDayPersistor,
      walletPersistor,
      promoCodeLoader,
      promoCodePersistor,
      referralPersistor,
      publicHolidayLoader,
      paymentGateway,
      paymentTransactionPersistor,
      userDeviceLoader,
      notificationGateway,
      walletLoader,
    } = deps

    try {
      const { userId, sessionId, paymentMethodId, startDate } = input

      // Load and validate session
      const session = await checkoutSessionLoader.getSessionById(sessionId)
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
      let resolvedMethod: { id: string; type: string; label: string; token: string }

      if (hardcoded) {
        resolvedMethod = { id: hardcoded.id, type: hardcoded.type, label: hardcoded.label, token: 'mock_token' }
      } else {
        const dbMethod = await paymentMethodLoader.getMethodById(paymentMethodId)
        if (!dbMethod || dbMethod.userId !== userId) {
          const { ResourceNotFoundError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceNotFoundError('Payment method', paymentMethodId)
        }
        resolvedMethod = { id: dbMethod.id, type: dbMethod.type, label: dbMethod.label, token: dbMethod.token }
      }

      const plan = await planLoader.getPlanById(session.planId)
      if (!plan) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Plan', session.planId)
      }

      // Determine if new user
      const lastOrder = await orderLoader.getLastOrderByUserId(userId)
      const isNewUser = !lastOrder

      // Build discount label
      let discountLabel: string | null = null
      if (session.promoCode) {
        const promo = await promoCodeLoader.getPromoByCode(session.promoCode)
        discountLabel =
          promo?.type === 'referral' ? 'Referral discount' : 'Promo discount'
      }

      // Record Payment Transaction as INITIATED
      const paymentTx = await paymentTransactionPersistor.createTransaction({
        userId,
        checkoutSessionId: sessionId,
        amountSar: session.totalDueSar,
        status: 'INITIATED',
      })

      // Charge payment method
      const chargeResult = await paymentGateway.charge({
        amountSar: session.totalDueSar,
        paymentToken: resolvedMethod.token,
        orderId: paymentTx.id, // We use paymentTx id as the idempotency/reference key for Moyasar
        description: `${plan.name} · ${startDate}`,
      })

      if (!chargeResult.success) {
        await paymentTransactionPersistor.updateTransaction(paymentTx.id, {
          status: 'FAILED',
          gatewayPaymentId: chargeResult.gatewayPaymentId || null,
        })
        const { PaymentFailedError } =
          await import('../../../shared/errors/index.js')
        throw new PaymentFailedError(
          chargeResult.errorMessage ?? 'Payment could not be processed.'
        )
      }

      // Mark transaction as SUCCESS
      await paymentTransactionPersistor.updateTransaction(paymentTx.id, {
        status: 'SUCCESS',
        gatewayPaymentId: chargeResult.gatewayPaymentId,
      })

      // Create order
      const order = await orderPersistor.createOrder({
        userId,
        subscriptionId: null,
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
        gatewayPaymentId: chargeResult.gatewayPaymentId,
        status: 'confirmed',
        isNewUser,
      })

      // Fetch holidays for the subscription window (~1 year to be safe)
      const fromStr = startDate
      const toDate = addDays(new Date(startDate + 'T00:00:00Z'), 400)
      const toStr = toYYYYMMDD(toDate)
      const holidayDates = new Set(
        await publicHolidayLoader.getHolidayDates(fromStr, toStr)
      )

      // Create subscription
      const subscription = await subscriptionPersistor.createSubscription({
        userId,
        orderId: order.id,
        planId: plan.id,
        mealType: session.mealType,
        status: 'active',
        totalMealDays: plan.mealCount,
        deliveredCount: 0,
        skippedCount: 0,
        startDate,
        endDate: startDate, // will update after delivery days generated
        skipDaysAllowed: plan.skipDaysAllowed,
        skipDaysUsed: 0,
        pauseDaysAllowed: plan.pauseDaysAllowed,
        pauseDaysUsed: 0,
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
      })

      // Generate delivery days
      const dayInputs = generateDeliveryDays(
        startDate,
        plan.mealCount,
        session.mealType,
        subscription.id,
        userId,
        holidayDates
      )
      const deliveryDays =
        await deliveryDayPersistor.bulkCreateDeliveryDays(dayInputs)

      const lastDeliveryDate =
        deliveryDays[deliveryDays.length - 1]?.date ?? startDate

      // Update subscription endDate and link to order
      await subscriptionPersistor.updateSubscription(subscription.id, {
        endDate: lastDeliveryDate,
      })
      await orderPersistor.updateOrder(order.id, {
        subscriptionId: subscription.id,
      })

      // Mark session as confirmed
      await checkoutSessionPersistor.updateSession(sessionId, {
        status: 'confirmed',
      })

      // Mark payment method as last used (only for user-saved methods)
      if (!hardcoded) {
        await paymentMethodPersistor.markAsLastUsed(paymentMethodId, userId)
      }

      // Debit wallet if used
      if (session.walletCreditSar > 0) {
        await walletPersistor.createTransaction({
          userId,
          type: 'debit',
          amountSar: -session.walletCreditSar,
          label: `${plan.name} · ${new Date(startDate).toLocaleString('en', { month: 'short', year: 'numeric' })}`,
          description: startDate,
          referenceId: order.id,
        })
      }

      // Credit referrer if referral code used
      if (session.promoCode) {
        const promo = await promoCodeLoader.getPromoByCode(session.promoCode)
        if (promo?.type === 'referral' && promo.ownerUserId) {
          const rewardSar = Math.round(plan.priceSar * 0.1)
          
          await promoCodePersistor.incrementTimesUsed(promo.id)
          
          await walletPersistor.createTransaction({
            userId: promo.ownerUserId,
            type: 'credit',
            amountSar: rewardSar,
            label: 'Referral reward',
            description: `10% of SAR ${plan.priceSar}`,
            referenceId: order.id,
          })
          
          // Record referral
          await referralPersistor.createReferral({
            referrerUserId: promo.ownerUserId,
            referredUserId: userId,
            referralCode: session.promoCode,
            rewardCreditedSar: rewardSar,
            isRewarded: true,
          })

          // Send Referral Reward 🎁 push notification
          try {
            const balance = await walletLoader.getBalanceByUserId(promo.ownerUserId)
            const devices = await userDeviceLoader.getDevicesByUserId(promo.ownerUserId)
            await Promise.allSettled(
              devices.map(device =>
                notificationGateway.sendSingleNotification(
                  device.endpointArn,
                  'Referral Reward 🎁',
                  `Your friend subscribed! SAR ${rewardSar} has been credited to your wallet. New balance: SAR ${balance}.`,
                  { type: 'referral_reward' }
                )
              )
            )
          } catch (notifyError) {
            logger.error('Failed to send Referral Reward push notification', String(notifyError))
          }
        }
      }

      return {
        order_id: order.id,
        subscription_id: subscription.id,
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
