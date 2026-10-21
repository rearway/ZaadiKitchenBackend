import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  SlotNotEditableError,
} from '../../../shared/errors/domain.errors.js'
import {
  filledSlotsForStream,
  isPastWeek,
} from '../services/menuWeekPublish.js'

export interface SetMenuDayDefaultInput {
  weekId: string
  date: string
  mealType: 'executive' | 'salad'
  mealId: string
}

export function makeUC(deps: Deps) {
  return async function setMenuDayDefault(input: SetMenuDayDefaultInput) {
    const { logger, menuWeekLoader, menuWeekPersistor } = deps

    try {
      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      if (isPastWeek(week.status)) {
        throw new SlotNotEditableError()
      }

      const weekSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const match = filledSlotsForStream(
        weekSlots,
        input.date,
        input.mealType
      ).find(s => s.mealId === input.mealId)

      if (!match) {
        throw new ResourceNotFoundError('MenuSlot', input.mealId)
      }

      const updated = await menuWeekPersistor.setDayDefault(
        input.weekId,
        input.date,
        input.mealType,
        input.mealId
      )

      return {
        delivery_date: input.date,
        meal_type: input.mealType,
        default_meal_id: input.mealId,
        slot_id: updated.id,
      }
    } catch (error) {
      logger.error(
        'SetMenuDayDefault failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SetMenuDayDefault'
