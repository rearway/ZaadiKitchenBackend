import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  SlotNotEditableError,
  CannotClearDefaultError,
  CannotClearLastStreamMealError,
} from '../../../shared/errors/domain.errors.js'
import {
  evaluateWeekPublishReadiness,
  filledSlotsForStream,
  isPastWeek,
} from '../services/menuWeekPublish.js'
import { parseSlotIndex } from '../services/weekUtils.js'

export interface ClearMenuSlotInput {
  weekId: string
  slotId: string
}

export interface ClearMenuSlotOutput {
  slot_id: string
  meal: null
  is_filled: false
  week_fill_status: {
    filled_slots: number
    total_slots: number
    publish_ready: boolean
  }
}

export function makeUC(deps: Deps) {
  return async function clearMenuSlot(
    input: ClearMenuSlotInput
  ): Promise<ClearMenuSlotOutput> {
    const { logger, menuWeekLoader, menuWeekPersistor } = deps

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

      const weekSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const otherFilled = filledSlotsForStream(
        weekSlots,
        slot.deliveryDate,
        slot.mealType
      ).filter(s => s.id !== slot.id)

      if (week.status === 'published' && otherFilled.length === 0) {
        throw new CannotClearLastStreamMealError(
          slot.deliveryDate,
          slot.mealType
        )
      }

      if (slot.isDefault && otherFilled.length > 0) {
        throw new CannotClearDefaultError(slot.deliveryDate, slot.mealType)
      }

      await menuWeekPersistor.clearSlot(input.slotId)

      if (parseSlotIndex(slot.id) > 1) {
        await menuWeekPersistor.deleteSlot(input.slotId)
      }

      const allSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const remaining = allSlots.filter(s => s.id !== input.slotId)
      const filledSlots = remaining.filter(s => s.mealId).length
      const readiness = evaluateWeekPublishReadiness(remaining)

      return {
        slot_id: slot.id,
        meal: null,
        is_filled: false,
        week_fill_status: {
          filled_slots: filledSlots,
          total_slots: remaining.length,
          publish_ready: readiness.publishReady,
        },
      }
    } catch (error) {
      logger.error(
        'ClearMenuSlot failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ClearMenuSlot'
