import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  SlotNotEditableError,
} from '../../../shared/errors/domain.errors.js'

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
    publish_ready: false
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

      if (week.status === 'published' || week.status === 'past') {
        throw new SlotNotEditableError()
      }

      const slot = await menuWeekLoader.getSlotById(input.slotId)
      if (!slot || slot.weekId !== input.weekId) {
        throw new ResourceNotFoundError('MenuSlot', input.slotId)
      }

      await menuWeekPersistor.clearSlot(input.slotId)

      const allSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const filledSlots = allSlots.filter(
        s => s.mealId && s.id !== input.slotId
      ).length

      return {
        slot_id: slot.id,
        meal: null,
        is_filled: false,
        week_fill_status: {
          filled_slots: filledSlots,
          total_slots: allSlots.length,
          publish_ready: false,
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
