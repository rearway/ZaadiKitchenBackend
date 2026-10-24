import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import { getAdminPlannableWeeks, getDayLabel } from '../services/weekUtils.js'
import {
  canAddStreamSlot,
  evaluateWeekPublishReadiness,
  filledSlotsForStream,
  isWeekEditable,
} from '../services/menuWeekPublish.js'
import type { Meal } from '../../entities/Meal.js'
import type { MenuSlot } from '../../entities/MenuSlot.js'

export interface GetMenuWeekInput {
  weekId: string
}

type AdminSlotMeal = {
  meal_id: string
  name_en: string
  kcal: number
  photo_url: string | null
  status: string
} | null

type AdminSlot = {
  slot_id: string
  meal_type: string
  meal_type_label: string
  is_default: boolean
  meal: AdminSlotMeal
  is_filled: boolean
  is_editable: boolean
}

export interface GetMenuWeekOutput {
  week_id: string
  week_number: number
  status: string
  is_editable: boolean
  days: Array<{
    delivery_date: string
    day_label: string
    date_label: string
    default_meal_id: {
      executive: string | null
      salad: string | null
    }
    can_add_executive: boolean
    can_add_salad: boolean
    executive_slots: AdminSlot[]
    salad_slots: AdminSlot[]
    slots: AdminSlot[]
  }>
  publish_ready: boolean
  publish_blocked_reason: string | null
}

function mapSlot(
  slot: MenuSlot,
  mealMap: Map<string, Meal>,
  isEditable: boolean
): AdminSlot {
  const meal = slot.mealId ? (mealMap.get(slot.mealId) ?? null) : null
  return {
    slot_id: slot.id,
    meal_type: slot.mealType,
    meal_type_label: slot.mealType === 'executive' ? 'Exec' : 'Salad',
    is_default: slot.isDefault,
    meal: meal
      ? {
          meal_id: meal.id,
          name_en: meal.nameEn,
          kcal: meal.kcal,
          photo_url: meal.photoUrl ?? null,
          status: meal.status,
        }
      : null,
    is_filled: !!slot.mealId,
    is_editable: isEditable,
  }
}

export function makeUC(deps: Deps) {
  return async function getMenuWeek(input: GetMenuWeekInput): Promise<GetMenuWeekOutput> {
    const { logger, menuWeekLoader, menuWeekPersistor, mealLoader } = deps

    try {
      const now = new Date()
      const bounds = getAdminPlannableWeeks(now).find(week => week.weekId === input.weekId)
      if (bounds) {
        await menuWeekPersistor.ensureWeekExists(bounds)
      }

      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      const slots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const isEditable = isWeekEditable(week.status)

      const mealIds = [...new Set(slots.filter(s => s.mealId).map(s => s.mealId as string))]
      const meals = mealIds.length > 0 ? await mealLoader.getMealsByIds(mealIds) : []
      const mealMap = new Map(meals.map(m => [m.id, m]))

      const dateOrder: string[] = []
      const slotsByDate = new Map<string, typeof slots>()
      for (const slot of slots) {
        if (!slotsByDate.has(slot.deliveryDate)) {
          dateOrder.push(slot.deliveryDate)
          slotsByDate.set(slot.deliveryDate, [])
        }
        slotsByDate.get(slot.deliveryDate)!.push(slot)
      }
      dateOrder.sort()

      const days = dateOrder.map(date => {
        const daySlots = slotsByDate.get(date) ?? []
        const executiveSlots = daySlots.filter(s => s.mealType === 'executive')
        const saladSlots = daySlots.filter(s => s.mealType === 'salad')
        const mappedExec = executiveSlots.map(s => mapSlot(s, mealMap, isEditable))
        const mappedSalad = saladSlots.map(s => mapSlot(s, mealMap, isEditable))

        const d = new Date(date)
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const dateLabel = `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`

        const execDefault = filledSlotsForStream(daySlots, date, 'executive').find(s => s.isDefault)
        const saladDefault = filledSlotsForStream(daySlots, date, 'salad').find(s => s.isDefault)

        return {
          delivery_date: date,
          day_label: getDayLabel(date),
          date_label: dateLabel,
          default_meal_id: {
            executive: execDefault?.mealId ?? null,
            salad: saladDefault?.mealId ?? null,
          },
          can_add_executive:
            isEditable && canAddStreamSlot(daySlots, date, 'executive'),
          can_add_salad: isEditable && canAddStreamSlot(daySlots, date, 'salad'),
          executive_slots: mappedExec,
          salad_slots: mappedSalad,
          slots: [...mappedExec, ...mappedSalad],
        }
      })

      const readiness = evaluateWeekPublishReadiness(slots, meals)

      return {
        week_id: week.id,
        week_number: week.weekNumber,
        status: week.status,
        is_editable: isEditable,
        days,
        publish_ready: week.status === 'draft' ? readiness.publishReady : false,
        publish_blocked_reason:
          week.status === 'draft' ? readiness.blockedReason : null,
      }
    } catch (error) {
      logger.error('GetMenuWeek failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMenuWeek'
