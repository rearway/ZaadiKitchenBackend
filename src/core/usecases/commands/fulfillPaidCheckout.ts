import type { Deps } from '../../entitygateway/index.js'
import type {
  CheckoutSession,
  MealType,
} from '../../entities/CheckoutSession.js'
import type { Plan } from '../../entities/Plan.js'
import type { Order } from '../../entities/Order.js'
import type { PaymentTransaction } from '../../entities/PaymentTransaction.js'
import type { PaymentMethod } from '../../entities/PaymentMethod.js'
import { findHardcodedMethod } from '../../constants/hardcoded-payment-methods.js'
import { walletCoversDebit } from '../../constants/payment-status.js'
import { needsGatewayCharge } from '../services/checkoutWalletUtils.js'
import { subscriptionBlocksNewPurchase } from '../services/subscriptionServicePeriod.js'
import {
  REFERRAL_REWARD_RATE_PCT,
  referralRewardSar,
} from '../../constants/referral.js'
import {
  InsufficientWalletBalanceError,
  ResourceNotFoundError,
} from '../../../shared/errors/index.js'
import { promoteSubscriptionInPlace } from './PromoteSubscription.js'

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

export type ResolvedPaymentMethod = {
  id: string
  type: string
  label: string
  token: string
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

const STALE_FULFILLMENT_MS = 2 * 60 * 1000

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

export function walletDebitLabelForNewPurchase(
  planName: string,
  startDate: string
): string {
  return `${planName} · ${new Date(startDate).toLocaleString('en', { month: 'short', year: 'numeric' })}`
}

export async function resolvePromoDiscountLabel(
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

/** No card charge — wallet (and promo) cover the full checkout amount. */
export function resolveWalletOnlyCheckoutPayment(
  paymentMethodId: string
): { hardcoded: boolean; method: ResolvedPaymentMethod } {
  return {
    hardcoded: true,
    method: {
      id: paymentMethodId,
      type: 'wallet',
      label: 'Wallet',
      token: '',
    },
  }
}

function pickSavedPaymentMethod(
  methods: PaymentMethod[],
  userId: string
): PaymentMethod | null {
  const owned = methods.filter(method => method.userId === userId && method.token)
  if (owned.length === 0) return null
  const ranked = [...owned].sort((a, b) => {
    if (a.isLastUsed !== b.isLastUsed) return a.isLastUsed ? -1 : 1
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
  return ranked[0] ?? null
}

export async function resolveCheckoutPaymentMethod(
  deps: Deps,
  userId: string,
  paymentMethodId: string
): Promise<{ hardcoded: boolean; method: ResolvedPaymentMethod }> {
  const hardcoded = findHardcodedMethod(paymentMethodId)
  if (hardcoded) {
    if (!deps.useMockPayment) {
      const saved = pickSavedPaymentMethod(
        await deps.paymentMethodLoader.getMethodsByUserId(userId),
        userId
      )
      if (saved) {
        return {
          hardcoded: false,
          method: {
            id: saved.id,
            type: saved.type,
            label: saved.label,
            token: saved.token,
          },
        }
      }
      throw new ResourceNotFoundError('Payment method', paymentMethodId)
    }
    return {
      hardcoded: true,
      method: {
        id: hardcoded.id,
        type: hardcoded.type,
        label: hardcoded.label,
        token: 'mock_token',
      },
    }
  }

  const dbMethod = await deps.paymentMethodLoader.getMethodById(paymentMethodId)
  if (!dbMethod || dbMethod.userId !== userId) {
    throw new ResourceNotFoundError('Payment method', paymentMethodId)
  }
  return {
    hardcoded: false,
    method: {
      id: dbMethod.id,
      type: dbMethod.type,
      label: dbMethod.label,
      token: dbMethod.token,
    },
  }
}

/** Wallet-only checkouts ignore the method id. Card checkouts may fall back to a saved card. */
export async function resolveOrderPayment(
  deps: Deps,
  userId: string,
  paymentMethodId: string,
  totalDueSar: number
): Promise<{ hardcoded: boolean; method: ResolvedPaymentMethod }> {
  if (!needsGatewayCharge(totalDueSar)) {
    return resolveWalletOnlyCheckoutPayment(paymentMethodId)
  }
  return resolveCheckoutPaymentMethod(deps, userId, paymentMethodId)
}

export function settledCheckoutPaymentMethodId(
  requestedPaymentMethodId: string,
  resolved: { hardcoded: boolean; method: ResolvedPaymentMethod }
): string {
  return resolved.hardcoded ? requestedPaymentMethodId : resolved.method.id
}

function buildConfirmedOrderInput(ctx: {
  userId: string
  plan: Plan
  session: CheckoutSession
  paymentMethodId: string
  hardcoded: boolean
  resolvedMethod: ResolvedPaymentMethod
  gatewayPaymentId: string | null
  subscriptionId: string | null
  startDate: string
  discountLabel: string | null
  isNewUser: boolean
}): Omit<Order, 'id' | 'createdAt' | 'updatedAt'> {
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
    gatewayPaymentId,
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
    'checkoutSessionPersistor' | 'paymentMethodPersistor' | 'walletPersistor'
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
    await deps.walletPersistor.createDebitIfSufficient({
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
    | 'referralLoader'
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
    isNewUser: boolean
  }
): Promise<void> {
  if (!input.session.promoCode || !input.isNewUser) return
  if (await deps.referralLoader.hasUserBeenReferred(input.userId)) return

  const promo = await deps.promoCodeLoader.getPromoByCode(
    input.session.promoCode
  )
  if (promo?.type !== 'referral' || !promo.ownerUserId) return
  if (promo.ownerUserId === input.userId) return

  const rewardSar = referralRewardSar(input.plan.priceSar)

  await deps.promoCodePersistor.incrementTimesUsed(promo.id)

  await deps.walletPersistor.createTransaction({
    userId: promo.ownerUserId,
    type: 'credit',
    amountSar: rewardSar,
    label: 'Referral reward',
    description: `${REFERRAL_REWARD_RATE_PCT}% of SAR ${input.plan.priceSar}`,
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
    const enabled =
      await deps.commsLoader.isAutomationEnabled('referral_reward')
    if (!enabled) return
    const balance = await deps.walletLoader.getBalanceByUserId(
      promo.ownerUserId
    )
    const devices = await deps.userDeviceLoader.getDevicesByUserId(
      promo.ownerUserId
    )
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
  selectedMealId: null
  status: 'scheduled'
  deliveredAt: null
}> {
  const days: Array<{
    subscriptionId: string
    userId: string
    date: string
    mealType: MealType
    mealName: null
    selectedMealId: null
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
        selectedMealId: null,
        status: 'scheduled',
        deliveredAt: null,
      })
    }
    cursor = addDays(cursor, 1)
  }

  return days
}

export interface FulfillPaidCheckoutInput {
  userId: string
  session: CheckoutSession
  plan: Plan
  paymentMethodId: string
  hardcoded: boolean
  resolvedMethod: ResolvedPaymentMethod
  gatewayPaymentId: string | null
  paymentTransactionId: string
  /** When the row is already FULFILLING, a stale reconciler may resume it. */
  alreadyFulfilling?: boolean
  startDate: string
}

async function loadOrder(
  deps: Deps,
  gatewayPaymentId: string | null
): Promise<Order | null> {
  if (!gatewayPaymentId) return null
  return deps.orderLoader.getOrderByGatewayPaymentId(gatewayPaymentId)
}

async function ensureNewSubscription(
  deps: Deps,
  input: FulfillPaidCheckoutInput,
  order: Order
): Promise<{ order: Order; subscriptionId: string }> {
  if (order.subscriptionId) {
    const linked = await deps.subscriptionLoader.getSubscriptionById(
      order.subscriptionId
    )
    if (linked) {
      const days = await deps.deliveryDayLoader.getDeliveryDaysBySubscription(
        linked.id
      )
      if (days.length === 0) {
        await writeDeliveryDays(deps, input, linked.id)
      }
      return { order, subscriptionId: linked.id }
    }
  }

  const live = await deps.subscriptionLoader.getActiveSubscriptionByUserId(
    input.userId
  )
  if (live && live.orderId === order.id) {
    const linkedOrder = await deps.orderPersistor.updateOrder(order.id, {
      subscriptionId: live.id,
    })
    return { order: linkedOrder, subscriptionId: live.id }
  }
  if (live && subscriptionBlocksNewPurchase(live)) {
    throw new Error('Refusing to create a second subscription for this payment')
  }
  if (live) {
    await deps.subscriptionPersistor.updateSubscription(live.id, {
      status: 'expired',
    })
  }

  const subscription = await deps.subscriptionPersistor.createSubscription({
    userId: input.userId,
    orderId: order.id,
    planId: input.plan.id,
    mealType: input.session.mealType,
    status: 'active',
    totalMealDays: input.plan.mealCount,
    deliveredCount: 0,
    skippedCount: 0,
    startDate: input.startDate,
    endDate: input.startDate,
    skipDaysAllowed: input.plan.skipDaysAllowed,
    skipDaysUsed: 0,
    pauseDaysAllowed: input.plan.pauseDaysAllowed,
    pauseDaysUsed: 0,
    pausedFrom: null,
    pausedUntil: null,
    pauseCeilingDate: null,
  })

  const lastDeliveryDate = await writeDeliveryDays(deps, input, subscription.id)
  await deps.subscriptionPersistor.updateSubscription(subscription.id, {
    endDate: lastDeliveryDate,
  })
  const linkedOrder = await deps.orderPersistor.updateOrder(order.id, {
    subscriptionId: subscription.id,
  })
  return { order: linkedOrder, subscriptionId: subscription.id }
}

async function writeDeliveryDays(
  deps: Deps,
  input: FulfillPaidCheckoutInput,
  subscriptionId: string
): Promise<string> {
  const fromStr = input.startDate
  const toDate = addDays(new Date(input.startDate + 'T00:00:00Z'), 400)
  const toStr = toYYYYMMDD(toDate)
  const holidayDates = new Set(
    await deps.publicHolidayLoader.getHolidayDates(fromStr, toStr)
  )
  const dayInputs = generateDeliveryDays(
    input.startDate,
    input.plan.mealCount,
    input.session.mealType,
    subscriptionId,
    input.userId,
    holidayDates
  )
  const deliveryDays =
    await deps.deliveryDayPersistor.bulkCreateDeliveryDays(dayInputs)
  return deliveryDays[deliveryDays.length - 1]?.date ?? input.startDate
}

async function fulfillBody(
  deps: Deps,
  input: FulfillPaidCheckoutInput
): Promise<CreateOrderOutput> {
  const promotionSubscriptionId = input.session.promotionSubscriptionId ?? null
  let order = await loadOrder(deps, input.gatewayPaymentId)

  if (!order && input.session.walletCreditSar > 0) {
    const balance = await deps.walletLoader.getBalanceByUserId(input.userId)
    if (!walletCoversDebit(balance, input.session.walletCreditSar)) {
      throw new InsufficientWalletBalanceError()
    }
  }

  if (promotionSubscriptionId) {
    const subscription = await deps.subscriptionLoader.getSubscriptionById(
      promotionSubscriptionId
    )
    if (!subscription || subscription.userId !== input.userId) {
      throw new ResourceNotFoundError('Subscription', promotionSubscriptionId)
    }
    const effectiveStartDate = subscription.startDate
    const promotionDiscountLabel = resolvePromotionDiscountLabel(
      input.session.priorPlanCreditSar ?? 0
    )
    if (!order) {
      order = await deps.orderPersistor.createOrder(
        buildConfirmedOrderInput({
          userId: input.userId,
          plan: input.plan,
          session: input.session,
          paymentMethodId: input.paymentMethodId,
          hardcoded: input.hardcoded,
          resolvedMethod: input.resolvedMethod,
          gatewayPaymentId: input.gatewayPaymentId,
          subscriptionId: subscription.id,
          startDate: effectiveStartDate,
          discountLabel: promotionDiscountLabel,
          isNewUser: false,
        })
      )
    }

    const { subscription: updatedSub } = await promoteSubscriptionInPlace(
      deps,
      {
        userId: input.userId,
        subscription,
        newPlan: input.plan,
        mealType: input.session.mealType,
      }
    )
    await deps.subscriptionPersistor.updateSubscription(updatedSub.id, {
      orderId: order.id,
    })
    await finalizePaidCheckout(deps, {
      sessionId: input.session.id,
      userId: input.userId,
      paymentMethodId: input.paymentMethodId,
      hardcoded: input.hardcoded,
      walletCreditSar: input.session.walletCreditSar,
      walletDebitLabel: `${input.plan.name} upgrade`,
      walletDescription: effectiveStartDate,
      orderId: order.id,
    })
    return toCreateOrderOutput(
      order.id,
      updatedSub.id,
      false,
      input.plan,
      input.session,
      effectiveStartDate,
      promotionDiscountLabel
    )
  }

  const promoDiscountLabel = await resolvePromoDiscountLabel(
    input.session,
    deps.promoCodeLoader
  )
  const lastOrder = order
    ? null
    : await deps.orderLoader.getLastOrderByUserId(input.userId)
  const isNewUser = order ? order.isNewUser : !lastOrder

  if (!order) {
    order = await deps.orderPersistor.createOrder(
      buildConfirmedOrderInput({
        userId: input.userId,
        plan: input.plan,
        session: input.session,
        paymentMethodId: input.paymentMethodId,
        hardcoded: input.hardcoded,
        resolvedMethod: input.resolvedMethod,
        gatewayPaymentId: input.gatewayPaymentId,
        subscriptionId: null,
        startDate: input.startDate,
        discountLabel: promoDiscountLabel,
        isNewUser,
      })
    )
  }

  await finalizePaidCheckout(deps, {
    sessionId: input.session.id,
    userId: input.userId,
    paymentMethodId: input.paymentMethodId,
    hardcoded: input.hardcoded,
    walletCreditSar: input.session.walletCreditSar,
    walletDebitLabel: walletDebitLabelForNewPurchase(
      input.plan.name,
      input.startDate
    ),
    walletDescription: input.startDate,
    orderId: order.id,
  })

  const ensured = await ensureNewSubscription(deps, input, order)

  await applyReferralRewardIfEligible(deps, {
    userId: input.userId,
    session: input.session,
    plan: input.plan,
    orderId: ensured.order.id,
    isNewUser,
  })

  return toCreateOrderOutput(
    ensured.order.id,
    ensured.subscriptionId,
    isNewUser,
    input.plan,
    input.session,
    input.startDate,
    promoDiscountLabel
  )
}

/**
 * Idempotent order + subscription write for a payment that is already settled
 * (or a zero-due wallet checkout). A second caller for the same payment does
 * not create a second subscription.
 */
export async function fulfillPaidCheckout(
  deps: Deps,
  input: FulfillPaidCheckoutInput
): Promise<CreateOrderOutput> {
  if (!input.alreadyFulfilling) {
    const won = await deps.paymentTransactionPersistor.compareAndSetStatus(
      input.paymentTransactionId,
      ['PAID_UNFULFILLED', 'INITIATED'],
      'FULFILLING'
    )
    if (!won) {
      const existing = await loadOrder(deps, input.gatewayPaymentId)
      if (existing?.subscriptionId) {
        const promoDiscountLabel = input.session.promotionSubscriptionId
          ? resolvePromotionDiscountLabel(input.session.priorPlanCreditSar ?? 0)
          : await resolvePromoDiscountLabel(input.session, deps.promoCodeLoader)
        await deps.paymentTransactionPersistor.updateTransaction(
          input.paymentTransactionId,
          { status: 'SUCCESS', gatewayPaymentId: input.gatewayPaymentId }
        )
        return toCreateOrderOutput(
          existing.id,
          existing.subscriptionId,
          existing.isNewUser,
          input.plan,
          input.session,
          existing.startDate,
          promoDiscountLabel
        )
      }
      throw new Error('Payment fulfillment already in progress')
    }
  }

  try {
    const output = await fulfillBody(deps, input)
    await deps.paymentTransactionPersistor.updateTransaction(
      input.paymentTransactionId,
      { status: 'SUCCESS', gatewayPaymentId: input.gatewayPaymentId }
    )
    return output
  } catch (error) {
    await deps.paymentTransactionPersistor
      .updateTransaction(input.paymentTransactionId, {
        status: 'PAID_UNFULFILLED',
        gatewayPaymentId: input.gatewayPaymentId,
      })
      .catch(markError => {
        deps.logger.error(
          'Failed to mark payment for reconcile',
          markError instanceof Error ? markError.message : String(markError)
        )
      })
    throw error
  }
}

export function fulfillmentIsStale(
  tx: PaymentTransaction,
  now = Date.now()
): boolean {
  return now - new Date(tx.updatedAt).getTime() >= STALE_FULFILLMENT_MS
}

/** Finish a paid payment transaction that does not yet have a subscription. */
export async function resumePaidCheckout(
  deps: Deps,
  tx: PaymentTransaction,
  gatewayPaymentId: string | null
): Promise<CreateOrderOutput> {
  const session = await deps.checkoutSessionLoader.getSessionById(
    tx.checkoutSessionId
  )
  if (!session) {
    throw new Error(`Checkout session missing for payment ${tx.id}`)
  }
  const plan = await deps.planLoader.getPlanById(session.planId)
  if (!plan) throw new ResourceNotFoundError('Plan', session.planId)

  const paymentMethodId = tx.paymentMethodId
  const startDate = tx.startDate
  if (!paymentMethodId || !startDate) {
    throw new Error(
      `Payment ${tx.id} is missing the checkout intent required to finish the subscription`
    )
  }

  const resolved = await resolveOrderPayment(
    deps,
    tx.userId,
    paymentMethodId,
    session.totalDueSar
  )
  return fulfillPaidCheckout(deps, {
    userId: tx.userId,
    session,
    plan,
    paymentMethodId: settledCheckoutPaymentMethodId(paymentMethodId, resolved),
    hardcoded: resolved.hardcoded,
    resolvedMethod: resolved.method,
    gatewayPaymentId,
    paymentTransactionId: tx.id,
    alreadyFulfilling: tx.status === 'FULFILLING',
    startDate,
  })
}
