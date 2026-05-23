import type { Meal } from './Meal.js'

export interface MenuSlot {
  id: string          // e.g. 'slot_w2025-19_sun_exec'
  weekId: string
  deliveryDate: string
  mealType: 'executive' | 'salad'
  mealId?: string
  createdAt: Date
  updatedAt: Date
}

export interface MenuSlotWithMeal extends MenuSlot {
  meal?: Meal
}
