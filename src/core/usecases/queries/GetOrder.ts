import { Deps } from '../../entitygateway/index.js'

export interface GetOrderInput {
  userId: string
  orderId: string
}

export interface GetOrderOutput {
  order_id: string
  subscription_id: string | null
  status: string
  plan_id: string
  meal_type: string
  meal_count: number
  start_date: string
  summary: {
    plan_price_sar: number
    wallet_credit_sar: number
    promo_discount_sar: number
    promo_code: string | null
    discount_label: string | null
    total_paid_sar: number
  }
  payment_method: {
    type: string
    label: string
  } | null
  created_at: string
}

export function makeUC(deps: Deps) {
  return async function getOrder(
    input: GetOrderInput
  ): Promise<GetOrderOutput> {
    const { logger, orderLoader, planLoader } = deps
    try {
      const { orderId } = input
      const order = await orderLoader.getOrderById(orderId)

      if (!order) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Order', orderId)
      }

      const plan = await planLoader.getPlanById(order.planId)

      return {
        order_id: order.id,
        subscription_id: order.subscriptionId ?? null,
        status: order.status,
        plan_id: plan?.slug ?? order.planId,
        meal_type: order.mealType,
        meal_count: order.mealCount,
        start_date: order.startDate,
        summary: {
          plan_price_sar: order.planPriceSar,
          wallet_credit_sar: order.walletCreditSar,
          promo_discount_sar: order.promoDiscountSar,
          promo_code: order.promoCode ?? null,
          discount_label: order.discountLabel ?? null,
          total_paid_sar: order.totalPaidSar,
        },
        payment_method: order.paymentMethodType
          ? {
              type: order.paymentMethodType,
              label: order.paymentMethodLabel ?? '',
            }
          : null,
        created_at: order.createdAt.toISOString(),
      }
    } catch (error) {
      logger.error(
        'Failed to get order',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetOrder'
