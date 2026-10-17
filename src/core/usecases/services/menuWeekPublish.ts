import type { Meal } from '../../entities/Meal.js'
import type { MenuSlot } from '../../entities/MenuSlot.js'
import { getDayLabel } from './weekUtils.js'

export const MAX_DISHES_PER_STREAM = 3

export type MealTypeStream = 'executive' | 'salad'

export function slotsForStream(
  slots: MenuSlot[],
  date: string,
  mealType: MealTypeStream
): MenuSlot[] {
  return slots.filter(s => s.deliveryDate === date && s.mealType === mealType)
}

export function filledSlotsForStream(
  slots: MenuSlot[],
  date: string,
  mealType: MealTypeStream
): MenuSlot[] {
  return slotsForStream(slots, date, mealType).filter(s => !!s.mealId)
}

export function canAddStreamSlot(
  slots: MenuSlot[],
  date: string,
  mealType: MealTypeStream
): boolean {
  return slotsForStream(slots, date, mealType).length < MAX_DISHES_PER_STREAM
}

export interface WeekPublishReadiness {
  publishReady: boolean
  blockedReason: string | null
  filledDays: number
  totalDays: number
}

export function evaluateWeekPublishReadiness(
  slots: MenuSlot[],
  meals: Array<Pick<Meal, 'id' | 'status'>> = []
): WeekPublishReadiness {
  const mealMap = new Map(meals.map(m => [m.id, m]))
  const dates = [...new Set(slots.map(s => s.deliveryDate))].sort()
  const totalDays = dates.length

  if (totalDays === 0) {
    return {
      publishReady: false,
      blockedReason: 'No delivery days on this week',
      filledDays: 0,
      totalDays: 0,
    }
  }

  let filledDays = 0
  let blockedReason: string | null = null

  for (const date of dates) {
    const execFilled = filledSlotsForStream(slots, date, 'executive')
    const saladFilled = filledSlotsForStream(slots, date, 'salad')
    const label = getDayLabel(date)

    if (execFilled.length === 0) {
      blockedReason ??= `${label}: Executive missing`
      continue
    }
    if (saladFilled.length === 0) {
      blockedReason ??= `${label}: Salad missing`
      continue
    }
    if (execFilled.length > MAX_DISHES_PER_STREAM) {
      blockedReason ??= `${label}: Executive has more than ${MAX_DISHES_PER_STREAM} dishes`
      continue
    }
    if (saladFilled.length > MAX_DISHES_PER_STREAM) {
      blockedReason ??= `${label}: Salad has more than ${MAX_DISHES_PER_STREAM} dishes`
      continue
    }
    if (!execFilled.some(s => s.isDefault)) {
      blockedReason ??= `${label}: Executive default not set`
      continue
    }
    if (!saladFilled.some(s => s.isDefault)) {
      blockedReason ??= `${label}: Salad default not set`
      continue
    }

    const filled = [...execFilled, ...saladFilled]
    const draft = filled.find(s => {
      const meal = s.mealId ? mealMap.get(s.mealId) : undefined
      return meal?.status === 'draft'
    })
    if (draft) {
      blockedReason ??= `${label}: Draft meal on menu`
      continue
    }

    filledDays += 1
  }

  return {
    publishReady: filledDays === totalDays && !blockedReason,
    blockedReason: filledDays === totalDays ? null : blockedReason,
    filledDays,
    totalDays,
  }
}
