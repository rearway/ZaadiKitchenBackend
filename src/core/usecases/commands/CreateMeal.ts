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
  image?: import('../../entitygateway/Storage.js').FileData
}

export interface CreateMealOutput {
  message: string
  data: Pick<Meal, 'id' | 'nameEn' | 'status' | 'createdAt'> & { photoUrl?: string }
}

export function makeUC(deps: Deps) {
  return async function createMeal(
    input: CreateMealInput
  ): Promise<CreateMealOutput> {
    const { logger, mealLoader, mealPersistor, storageGateway } = deps

    try {
      const existing = await mealLoader.getMealByName(input.nameEn)
      if (existing) {
        const { ResourceAlreadyExistsError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceAlreadyExistsError('Meal', input.nameEn)
      }

      let photoUrl: string | undefined
      if (input.image) {
        const ext = input.image.mimeType.split('/')[1] || 'jpg'
        const tempId = crypto.randomUUID()
        const key = `meals/${tempId}/photo.${ext}`
        photoUrl = await storageGateway.uploadPublicFile(input.image, key)
      }

      const meal = await mealPersistor.createMeal({ ...input, photoUrl })
      return {
        message: 'Meal created successfully',
        data: {
          id: meal.id,
          nameEn: meal.nameEn,
          status: meal.status,
          createdAt: meal.createdAt,
          photoUrl: meal.photoUrl,
        },
      }
    } catch (error) {
      logger.error(
        'CreateMeal failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateMeal'
