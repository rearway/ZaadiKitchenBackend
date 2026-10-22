import type { Plan } from '../../entities/Plan.js'

export interface PlanDiscountFields {
  max_price_sar: number | null
  discount_percent: number | null
}

/**
 * `price_sar` stays the price actually charged; `max_price_sar` is the struck-through price.
 * Both discount fields are null when there is no real discount, so the app can hide the badge.
 */
export function toPlanDiscountFields(
  plan: Pick<Plan, 'priceSar' | 'maxPriceSar'>
): PlanDiscountFields {
  const { priceSar, maxPriceSar } = plan
  if (maxPriceSar == null || maxPriceSar <= priceSar) {
    return { max_price_sar: null, discount_percent: null }
  }
  return {
    max_price_sar: maxPriceSar,
    discount_percent: Math.round(((maxPriceSar - priceSar) / maxPriceSar) * 100),
  }
}

export function computePricePerMealSar(priceSar: number, mealCount: number): number {
  return Math.round((priceSar / mealCount) * 100) / 100
}
