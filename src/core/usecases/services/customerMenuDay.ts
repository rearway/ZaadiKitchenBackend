import type { Meal } from '../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../entities/MenuSlot.js'
import type { Subscription } from '../../entities/Subscription.js'
import {
  filledSlotsForStream,
  resolveEffectiveMeal,
} from './resolveEffectiveMeal.js'
import { isAfterSkipCutoff } from './weekUtils.js'
import { canUseSkipAndPause } from './subscriptionServicePeriod.js'

export type MealSummary = {
  meal_id: string
  name_en: string
  meal_type: string
  kcal: number
  emoji: string
  photo_url: string | null
}

export type MealOptionCard = MealSummary & {
  is_default: boolean
  is_selected: boolean
}

export function toMealSummary(meal: Meal): MealSummary {
  return {
    meal_id: meal.id,
    name_en: meal.nameEn,
    meal_type: meal.mealType,
    kcal: meal.kcal,
    emoji: meal.emoji,
    photo_url: meal.photoUrl ?? null,
  }
}

export function toMealOption(
  slot: MenuSlotWithMeal,
  selectedMealId?: string | null
): MealOptionCard | null {
  if (!slot.meal || !slot.mealId) return null
  return {
    ...toMealSummary(slot.meal),
    is_default: !!slot.isDefault,
    is_selected: selectedMealId != null && slot.meal.id === selectedMealId,
  }
}

export function uniqueSortedDates(
  slots: MenuSlotWithMeal[],
  from: string,
  to: string
): string[] {
  const set = new Set<string>()
  for (const slot of slots) {
    if (slot.deliveryDate >= from && slot.deliveryDate <= to) {
      set.add(slot.deliveryDate)
    }
  }
  return [...set].sort()
}

export function slotsForDate(
  slots: MenuSlotWithMeal[],
  date: string
): MenuSlotWithMeal[] {
  return slots.filter(s => s.deliveryDate === date)
}

export function streamOptions(
  slots: MenuSlotWithMeal[],
  mealType: 'executive' | 'salad',
  selectedMealId?: string | null
): MealOptionCard[] {
  return filledSlotsForStream(slots, mealType)
    .map(s => toMealOption(s as MenuSlotWithMeal, selectedMealId))
    .filter((option): option is MealOptionCard => option !== null)
}

export function defaultMealId(
  slots: MenuSlotWithMeal[],
  mealType: 'executive' | 'salad'
): string | null {
  const filled = filledSlotsForStream(slots, mealType)
  return filled.find(s => s.isDefault)?.mealId ?? filled[0]?.mealId ?? null
}

export function canChangeMealChoice(input: {
  subscription: Subscription | null
  dayStatus?: string | null
  deliveryDate: string
  optionCount: number
  now?: Date
}): boolean {
  if (!input.subscription || !canUseSkipAndPause(input.subscription)) {
    return false
  }
  if (input.dayStatus !== 'scheduled') return false
  if (isAfterSkipCutoff(input.deliveryDate, input.now ?? new Date())) {
    return false
  }
  return input.optionCount >= 2
}

export type CustomerMenuStatus =
  | 'published'
  | 'not_published'
  | 'non_working_day'
  | 'holiday'

/** Friday and Saturday are not kitchen days. The date is a civil YYYY-MM-DD. */
export function isNonWorkingCivilDay(date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return day === 5 || day === 6
}

/**
 * Weekend wins over a holiday. A working day with no published slots is
 * `not_published` so draft menus are not exposed.
 */
export function resolveCustomerMenuStatus(input: {
  date: string
  isHoliday: boolean
  hasPublishedMenu: boolean
}): CustomerMenuStatus {
  if (isNonWorkingCivilDay(input.date)) return 'non_working_day'
  if (input.isHoliday) return 'holiday'
  if (input.hasPublishedMenu) return 'published'
  return 'not_published'
}

export function resolveDayEffectiveMeal(
  mealType: 'executive' | 'salad',
  selectedMealId: string | null | undefined,
  slots: MenuSlotWithMeal[]
): Meal | null {
  return resolveEffectiveMeal({ mealType, selectedMealId, slots })
}
