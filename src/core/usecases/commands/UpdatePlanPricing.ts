import { Deps } from '../../entitygateway/index.js'
import { computePricePerMealSar } from '../services/planPricing.js'
import { toAdminPlanView, type AdminPlanView } from '../queries/GetAdminPlans.js'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface UpdatePlanPricingInput {
  /** Plan slug (e.g. `week`) or plan UUID */
  planId: string
  priceSar?: number
  /** `null` removes the discount */
  maxPriceSar?: number | null
}

export type UpdatePlanPricingOutput = {
  message: string
  data: AdminPlanView
}

export function makeUC(deps: Deps) {
  return async function updatePlanPricing(
    input: UpdatePlanPricingInput
  ): Promise<UpdatePlanPricingOutput> {
    const { logger, planLoader, planPersistor } = deps
    try {
      const { ValidationError, ResourceNotFoundError } = await import(
        '../../../shared/errors/index.js'
      )

      if (input.priceSar === undefined && input.maxPriceSar === undefined) {
        throw new ValidationError(
          'Provide price_sar and/or max_price_sar to update.'
        )
      }

      const plan =
        (await planLoader.getPlanBySlug(input.planId)) ??
        (UUID_REGEX.test(input.planId)
          ? await planLoader.getPlanById(input.planId)
          : null)
      if (!plan) {
        throw new ResourceNotFoundError('PLAN_NOT_FOUND', input.planId)
      }

      const priceSar = input.priceSar ?? plan.priceSar
      const maxPriceSar =
        input.maxPriceSar === undefined ? plan.maxPriceSar : input.maxPriceSar

      if (!(priceSar > 0)) {
        throw new ValidationError('price_sar must be greater than 0.')
      }
      if (maxPriceSar !== null && maxPriceSar < priceSar) {
        throw new ValidationError(
          'max_price_sar must be greater than or equal to price_sar.',
          { price_sar: priceSar, max_price_sar: maxPriceSar }
        )
      }

      const updated = await planPersistor.updatePlanPricing(plan.id, {
        priceSar,
        maxPriceSar,
        pricePerMealSar: computePricePerMealSar(priceSar, plan.mealCount),
      })

      return {
        message: 'Plan pricing updated successfully',
        data: toAdminPlanView(updated),
      }
    } catch (error) {
      logger.error(
        'Failed to update plan pricing',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UpdatePlanPricing'
