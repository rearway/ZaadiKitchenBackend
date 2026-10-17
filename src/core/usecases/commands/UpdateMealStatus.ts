import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, MealInPublishedWeekError } from '../../../shared/errors/domain.errors.js'
import { getPublishedWeeksBlockingMealEdit } from '../services/getMealPublishedEditBlockers.js'
import { pendingToLiveUpdates } from '../services/mealPendingChanges.js'

export interface UpdateMealStatusInput {
  mealId: string
  status: 'active' | 'draft'
  confirmPublishedEdit?: boolean
}

export interface UpdateMealStatusOutput {
  meal_id: string
  previous_status: string
  status: string
  updated_at: Date
  pending_applied: boolean
  affects_live_menu: boolean
  affected_weeks: string[]
}

export function makeUC(deps: Deps) {
  return async function updateMealStatus(input: UpdateMealStatusInput): Promise<UpdateMealStatusOutput> {
    const { logger, mealLoader, mealPersistor, menuWeekLoader } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      const affectedWeeks = await getPublishedWeeksBlockingMealEdit(
        input.mealId,
        menuWeekLoader
      )
      const affectsLiveMenu = affectedWeeks.length > 0

      if (input.status === 'active' && meal.status === 'updated') {
        if (!input.confirmPublishedEdit) {
          throw new MealInPublishedWeekError(affectedWeeks, { action: 'activate' })
        }

        const liveUpdates = meal.pendingChanges
          ? pendingToLiveUpdates(meal.pendingChanges)
          : {}
        const updated = await mealPersistor.updateMeal(input.mealId, {
          ...liveUpdates,
          status: 'active',
          pendingChanges: null,
        })

        return {
          meal_id: updated.id,
          previous_status: meal.status,
          status: updated.status,
          updated_at: updated.updatedAt,
          pending_applied: true,
          affects_live_menu: affectsLiveMenu,
          affected_weeks: affectedWeeks,
        }
      }

      if (input.status === 'draft') {
        if (affectsLiveMenu && !input.confirmPublishedEdit) {
          throw new MealInPublishedWeekError(affectedWeeks, { action: 'draft' })
        }

        if (meal.status === 'updated' || meal.pendingChanges) {
          const updated = await mealPersistor.updateMeal(input.mealId, {
            status: 'draft',
            pendingChanges: null,
          })
          return {
            meal_id: updated.id,
            previous_status: meal.status,
            status: updated.status,
            updated_at: updated.updatedAt,
            pending_applied: false,
            affects_live_menu: affectsLiveMenu,
            affected_weeks: affectedWeeks,
          }
        }
      }

      const updated = await mealPersistor.updateMealStatus(input.mealId, input.status)
      return {
        meal_id: updated.id,
        previous_status: meal.status,
        status: updated.status,
        updated_at: updated.updatedAt,
        pending_applied: false,
        affects_live_menu: affectsLiveMenu,
        affected_weeks: affectedWeeks,
      }
    } catch (error) {
      logger.error('UpdateMealStatus failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'UpdateMealStatus'
