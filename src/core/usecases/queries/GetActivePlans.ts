import { Deps } from '../../entitygateway/index.js'

export interface GetActivePlansInput {
  userId: string
}

export interface GetActivePlansOutput {
  plans: Array<{
    id: string
    name: string
    price_sar: number
    meal_count: number
    price_per_meal_sar: number
    skip_days_allowed: number
    pause_days_allowed: number
    is_most_popular: boolean
    is_last_plan: boolean
  }>
  wallet_balance_sar: number
}

export function makeUC(deps: Deps) {
  return async function getActivePlans(
    input: GetActivePlansInput
  ): Promise<GetActivePlansOutput> {
    const { logger, planLoader, orderLoader, walletLoader } = deps
    try {
      const { userId } = input
      const [plans, lastOrder, walletBalance] = await Promise.all([
        planLoader.getActivePlans(),
        orderLoader.getLastOrderByUserId(userId),
        walletLoader.getBalanceByUserId(userId),
      ])

      return {
        plans: plans.map(p => ({
          id: p.slug,
          name: p.name,
          price_sar: p.priceSar,
          meal_count: p.mealCount,
          price_per_meal_sar: p.pricePerMealSar,
          skip_days_allowed: p.skipDaysAllowed,
          pause_days_allowed: p.pauseDaysAllowed,
          is_most_popular: p.isMostPopular,
          is_last_plan: lastOrder?.planId === p.id,
        })),
        wallet_balance_sar: walletBalance,
      }
    } catch (error) {
      logger.error(
        'Failed to get active plans',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetActivePlans'
