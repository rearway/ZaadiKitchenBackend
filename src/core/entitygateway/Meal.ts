import type { Meal } from '../entities/Meal.js'

export interface CreateMealInput {
  nameEn: string
  nameAr?: string
  mealType: 'executive' | 'salad'
  kcal: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  chefNote?: string
  keyIngredients?: string[]
  emoji?: string
  photoUrl?: string
}

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface MealWithUsage extends Meal {
  alreadyUsed?: boolean
  usedOnDay?: string | null
}

export interface MealLoader {
  getMealById(id: string): Promise<Meal | null>
  getMealByName(nameEn: string, excludeId?: string): Promise<Meal | null>
  getMeals(filters: {
    status?: 'draft' | 'active' | 'all'
    mealType?: 'executive' | 'salad' | 'all'
    q?: string
    page?: number
    perPage?: number
    excludeWeekId?: string
  }): Promise<{ meals: MealWithUsage[]; total: number }>
  getMealsByIds(ids: string[]): Promise<Meal[]>
  getMealsInWeek(
    weekId: string
  ): Promise<{ mealId: string; dayLabel: string }[]>
}

export interface MealPersistor {
  createMeal(input: CreateMealInput): Promise<Meal>
  updateMeal(
    id: string,
    updates: Partial<Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Meal>
  updateMealStatus(id: string, status: 'active' | 'draft'): Promise<Meal>
  bulkCreateMeals(
    meals: CreateMealInput[]
  ): Promise<{ created: Meal[]; skipped: number; errors: ImportError[] }>
  deleteMeal(id: string): Promise<void>
  incrementTimesServed(mealIds: string[]): Promise<void>
  updateLastServed(mealIds: string[], date: string): Promise<void>
}
