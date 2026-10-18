import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  MealIsDraftError,
  SlotNotEditableError,
  MealAlreadyOnDayError,
} from '../../../shared/errors/domain.errors.js'
import {
  evaluateWeekPublishReadiness,
  isPastWeek,
  slotWithMealOnDate,
} from '../services/menuWeekPublish.js'

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
    meal_type: string
    kcal: number
    photo_url: string | null
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

      if (isPastWeek(week.status)) {
        throw new SlotNotEditableError()
      }

      const slot = await menuWeekLoader.getSlotById(input.slotId)
      if (!slot || slot.weekId !== input.weekId) {
        throw new ResourceNotFoundError('MenuSlot', input.slotId)
      }

      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      if (meal.status === 'draft') throw new MealIsDraftError()

      const weekSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const duplicate = slotWithMealOnDate(
        weekSlots,
        slot.deliveryDate,
        input.mealId,
        slot.id
      )
      if (duplicate) {
        throw new MealAlreadyOnDayError(slot.deliveryDate, meal.nameEn)
      }

      await menuWeekPersistor.assignMealToSlot(input.slotId, input.mealId)

      const slotsAfterAssign =
        await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const filledSlots = slotsAfterAssign.filter(s => s.mealId).length
      const readiness = evaluateWeekPublishReadiness(slotsAfterAssign)

      return {
        slot_id: slot.id,
        meal_type: slot.mealType,
        delivery_date: slot.deliveryDate,
        meal: {
          meal_id: meal.id,
          name_en: meal.nameEn,
          meal_type: meal.mealType,
          kcal: meal.kcal,
          photo_url: meal.photoUrl ?? null,
        },
        week_fill_status: {
          filled_slots: filledSlots,
          total_slots: slotsAfterAssign.length,
          publish_ready: readiness.publishReady,
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
