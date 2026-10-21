import type { MenuWeek } from '../entities/MenuWeek.js'
import type { MenuSlot, MenuSlotWithMeal } from '../entities/MenuSlot.js'

export interface EnsureWeekParams {
  weekId: string
  weekNumber: number
  year: number
  dateFrom: string
  dateTo: string
  deliveryDates: string[]
}

export interface MenuWeekLoader {
  getWeekById(weekId: string): Promise<MenuWeek | null>
  getWeeks(filters: { fromWeek?: string; count?: number }): Promise<MenuWeek[]>
  getSlotsByWeekId(weekId: string): Promise<MenuSlot[]>
  getSlotById(slotId: string): Promise<MenuSlot | null>
  getMenuForDateRange(from: string, to: string): Promise<MenuSlotWithMeal[]>
}

export interface MenuWeekPersistor {
  ensureWeekExists(params: EnsureWeekParams): Promise<{ week: MenuWeek; slots: MenuSlot[] }>
  createSlot(slot: {
    id: string
    weekId: string
    deliveryDate: string
    mealType: 'executive' | 'salad'
    mealId?: string | null
    isDefault?: boolean
  }): Promise<MenuSlot>
  assignMealToSlot(slotId: string, mealId: string): Promise<MenuSlot>
  setDayDefault(
    weekId: string,
    deliveryDate: string,
    mealType: 'executive' | 'salad',
    mealId: string
  ): Promise<MenuSlot>
  clearSlot(slotId: string): Promise<MenuSlot>
  deleteSlot(slotId: string): Promise<void>
  publishWeek(weekId: string, publishedBy: string): Promise<MenuWeek>
  unpublishWeek(weekId: string): Promise<MenuWeek>
  transitionPastWeeks(): Promise<void>
}
