import type { Deps } from '../../entitygateway/index.js'
import type { Meal } from '../../entities/index.js'

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
}

export interface CreateMealOutput {
  message: string
  data: Pick<Meal, 'id' | 'nameEn' | 'status' | 'createdAt'>
}

export function makeUC(deps: Deps) {
  return async function createMeal(input: CreateMealInput): Promise<CreateMealOutput> {
    const { logger, mealPersistor } = deps

    try {
      const meal = await mealPersistor.createMeal(input)
      return {
        message: 'Meal created successfully',
        data: { id: meal.id, nameEn: meal.nameEn, status: meal.status, createdAt: meal.createdAt },
      }
    } catch (error) {
      logger.error('CreateMeal failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'CreateMeal'
