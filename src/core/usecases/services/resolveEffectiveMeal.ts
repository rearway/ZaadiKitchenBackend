import type { Meal } from '../../entities/Meal.js'

export type EffectiveMealSlot = {
  mealType: 'executive' | 'salad'
  isDefault?: boolean
  mealId?: string | null
  meal?: Meal | null
}

export function filledSlotsForStream(
  slots: EffectiveMealSlot[],
  mealType: 'executive' | 'salad'
): EffectiveMealSlot[] {
  return slots.filter(
    s => s.mealType === mealType && !!s.meal && !!s.mealId
  )
}

/**
 * One dish per delivery: customer pick if it is still on that day's stream,
 * else the admin default, else the only filled dish, else the first filled.
 * Always returns live meal fields (pending edits are not applied).
 */
export function resolveEffectiveMeal(input: {
  mealType: 'executive' | 'salad'
  selectedMealId?: string | null
  slots: EffectiveMealSlot[]
}): Meal | null {
  if (input.selectedMealId) {
    const selected = input.slots.find(
      s => s.mealId === input.selectedMealId && s.meal
    )
    if (selected?.meal) return selected.meal
  }

  const options = filledSlotsForStream(input.slots, input.mealType)
  if (options.length === 0) return null

  const defaultSlot = options.find(s => s.isDefault)
  if (defaultSlot?.meal) return defaultSlot.meal

  return options[0].meal ?? null
}
