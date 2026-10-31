import type { Deps } from '../../entitygateway/index.js'
import type { Meal } from '../../entities/Meal.js'
import {
  ResourceNotFoundError,
  MealIsDraftError,
  SlotNotEditableError,
  DayMealTypeLimitError,
  MealAlreadyOnDayError,
} from '../../../shared/errors/domain.errors.js'
import {
  canAddStreamSlot,
  evaluateWeekPublishReadiness,
  isPastWeek,
  MAX_DISHES_PER_STREAM,
  slotWithMealOnDate,
  slotsForStream,
} from '../services/menuWeekPublish.js'
import { makeSlotId, nextAvailableSlotIndex } from '../services/weekUtils.js'
import { loadMealTypeDisplays } from '../services/mealDisplayNames.js'

export interface AddMenuSlotInput {
  weekId: string
  date: string
  mealType: 'executive' | 'salad'
  mealId?: string
}

export function makeUC(deps: Deps) {
  return async function addMenuSlot(input: AddMenuSlotInput) {
    const { logger, mealLoader, menuWeekLoader, menuWeekPersistor } = deps

    try {
      await loadMealTypeDisplays(deps.appSettingsLoader)
      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      if (isPastWeek(week.status)) {
        throw new SlotNotEditableError()
      }

      if (input.date < week.dateFrom || input.date > week.dateTo) {
        throw new ResourceNotFoundError('DeliveryDate', input.date)
      }

      const weekSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      if (!canAddStreamSlot(weekSlots, input.date, input.mealType)) {
        throw new DayMealTypeLimitError(
          input.mealType,
          input.date,
          MAX_DISHES_PER_STREAM
        )
      }

      let meal: Meal | null = null
      if (input.mealId) {
        meal = await mealLoader.getMealById(input.mealId)
        if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)
        if (meal.status === 'draft') throw new MealIsDraftError()
        if (slotWithMealOnDate(weekSlots, input.date, input.mealId)) {
          throw new MealAlreadyOnDayError(input.date, meal.nameEn)
        }
      }

      const existing = slotsForStream(weekSlots, input.date, input.mealType)
      const index = nextAvailableSlotIndex(existing.map(s => s.id))
      if (index == null) {
        throw new DayMealTypeLimitError(
          input.mealType,
          input.date,
          MAX_DISHES_PER_STREAM
        )
      }

      const created = await menuWeekPersistor.createSlot({
        id: makeSlotId(input.weekId, input.date, input.mealType, index),
        weekId: input.weekId,
        deliveryDate: input.date,
        mealType: input.mealType,
        mealId: input.mealId ?? null,
        isDefault: false,
      })

      if (input.mealId) {
        await menuWeekPersistor.assignMealToSlot(created.id, input.mealId)
      }

      const slotsAfter = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const readiness = evaluateWeekPublishReadiness(slotsAfter)

      return {
        slot_id: created.id,
        meal_type: created.mealType,
        delivery_date: created.deliveryDate,
        meal: meal
          ? {
              meal_id: meal.id,
              name_en: meal.nameEn,
              meal_type: meal.mealType,
              kcal: meal.kcal,
              photo_url: meal.photoUrl ?? null,
            }
          : null,
        week_fill_status: {
          filled_slots: slotsAfter.filter(s => s.mealId).length,
          total_slots: slotsAfter.length,
          publish_ready: readiness.publishReady,
        },
      }
    } catch (error) {
      logger.error(
        'AddMenuSlot failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'AddMenuSlot'
