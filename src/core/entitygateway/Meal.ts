import type { Meal, MealStatus } from '../entities/Meal.js'

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

export interface MealLoader {
  getMealById(id: string): Promise<Meal | null>
  getMealByName(nameEn: string, excludeId?: string): Promise<Meal | null>
  getMeals(filters: {
    status?: MealStatus | 'all' | 'assignable'
    mealType?: 'executive' | 'salad' | 'all'
    q?: string
    page?: number
    perPage?: number
  }): Promise<{ meals: Meal[]; total: number }>
  getMealsByIds(ids: string[]): Promise<Meal[]>
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
