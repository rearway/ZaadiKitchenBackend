import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  MealIsDraftError,
  MealAlreadyUsedInWeekError,
  SlotNotEditableError,
} from '../../../shared/errors/domain.errors.js'
import { getDayLabel } from '../services/weekUtils.js'

export interface AssignMealToSlotInput {
  weekId: string
  slotId: string
  mealId: string
}

export interface AssignMealToSlotOutput {
  slot_id: string
  meal_type: string
  delivery_date: string
  meal: {
    meal_id: string
    name_en: string
    kcal: number
  }
  week_fill_status: {
    filled_slots: number
    total_slots: number
    publish_ready: boolean
  }
}

export function makeUC(deps: Deps) {
  return async function assignMealToSlot(
    input: AssignMealToSlotInput
  ): Promise<AssignMealToSlotOutput> {
    const { logger, mealLoader, menuWeekLoader, menuWeekPersistor } = deps

    try {
      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      if (week.status === 'published' || week.status === 'past') {
        throw new SlotNotEditableError()
      }

      const slot = await menuWeekLoader.getSlotById(input.slotId)
      if (!slot || slot.weekId !== input.weekId) {
        throw new ResourceNotFoundError('MenuSlot', input.slotId)
      }

      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      if (meal.status === 'draft') throw new MealIsDraftError()

      // Check uniqueness within the week
      const mealsInWeek = await menuWeekLoader.getMealsInWeek(input.weekId)
      const duplicate = mealsInWeek.find(
        m => m.mealId === input.mealId && slot.id !== input.slotId
      )
      if (duplicate) {
        throw new MealAlreadyUsedInWeekError(
          meal.nameEn,
          duplicate.dayLabel,
          slot.mealType,
          { used_on_day: duplicate.dayLabel, used_in_slot: slot.mealType }
        )
      }

      await menuWeekPersistor.assignMealToSlot(input.slotId, input.mealId)

      // Recompute fill status
      const allSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const filledSlots = allSlots.filter(s => s.mealId).length

      return {
        slot_id: slot.id,
        meal_type: slot.mealType,
        delivery_date: slot.deliveryDate,
        meal: { meal_id: meal.id, name_en: meal.nameEn, kcal: meal.kcal },
        week_fill_status: {
          filled_slots: filledSlots,
          total_slots: allSlots.length,
          publish_ready: filledSlots === allSlots.length,
        },
      }
    } catch (error) {
      logger.error(
        'AssignMealToSlot failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'AssignMealToSlot'
