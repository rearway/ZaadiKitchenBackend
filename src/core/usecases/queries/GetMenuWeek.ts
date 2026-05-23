import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds, getDayLabel, makeSlotId } from '../services/weekUtils.js'

export interface GetMenuWeekInput {
  weekId: string
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
    slots: Array<{
      slot_id: string
      meal_type: string
      meal_type_label: string
      meal: {
        meal_id: string
        name_en: string
        kcal: number
      } | null
      is_filled: boolean
      is_editable: boolean
    }>
  }>
  publish_ready: boolean
  publish_blocked_reason: string | null
}

export function makeUC(deps: Deps) {
  return async function getMenuWeek(input: GetMenuWeekInput): Promise<GetMenuWeekOutput> {
    const { logger, menuWeekLoader, menuWeekPersistor, mealLoader } = deps

    try {
      // Ensure current and next weeks exist
      const now = new Date()
      const currentBounds = getSaudiWorkWeekBounds(now)
      const nextBounds = getNextSaudiWorkWeekBounds(now)

      if (input.weekId === currentBounds.weekId || input.weekId === nextBounds.weekId) {
        const bounds = input.weekId === currentBounds.weekId ? currentBounds : nextBounds
        await menuWeekPersistor.ensureWeekExists(bounds)
      }

      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      const slots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const isEditable = week.status === 'draft'

      // Load meals for filled slots
      const mealIds = [...new Set(slots.filter(s => s.mealId).map(s => s.mealId as string))]
      const meals = mealIds.length > 0 ? await mealLoader.getMealsByIds(mealIds) : []
      const mealMap = new Map(meals.map(m => [m.id, m]))

      // Group slots by delivery date, preserving day order (Sun–Thu)
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
        const daySlots = (slotsByDate.get(date) ?? [])
          .sort((a, b) => (a.mealType === 'executive' ? -1 : 1))

        const d = new Date(date)
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const dateLabel = `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`

        return {
          delivery_date: date,
          day_label: getDayLabel(date),
          date_label: dateLabel,
          slots: daySlots.map(slot => {
            const meal = slot.mealId ? (mealMap.get(slot.mealId) ?? null) : null
            return {
              slot_id: slot.id,
              meal_type: slot.mealType,
              meal_type_label: slot.mealType === 'executive' ? 'Exec' : 'Salad',
              meal: meal
                ? { meal_id: meal.id, name_en: meal.nameEn, kcal: meal.kcal }
                : null,
              is_filled: !!slot.mealId,
              is_editable: isEditable,
            }
          }),
        }
      })

      const totalSlots = slots.length
      const filledSlots = slots.filter(s => s.mealId).length
      const publishReady = filledSlots === totalSlots && totalSlots > 0

      let publishBlockedReason: string | null = null
      if (!publishReady && week.status === 'draft') {
        const unfilledCount = totalSlots - filledSlots
        if (unfilledCount === 1) {
          const unfilled = slots.find(s => !s.mealId)!
          publishBlockedReason = `1 slot unfilled (${getDayLabel(unfilled.deliveryDate)} ${unfilled.mealType === 'executive' ? 'Exec' : 'Salad'})`
        } else {
          publishBlockedReason = `${unfilledCount} slots unfilled`
        }
      }

      return {
        week_id: week.id,
        week_number: week.weekNumber,
        status: week.status,
        is_editable: isEditable,
        days,
        publish_ready: publishReady,
        publish_blocked_reason: publishBlockedReason,
      }
    } catch (error) {
      logger.error('GetMenuWeek failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMenuWeek'
