import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'

export interface GetAdminMealsInput {
  status?: 'all' | 'active' | 'draft'
  mealType?: 'all' | 'executive' | 'salad'
  q?: string
  page?: number
  perPage?: number
  context?: 'picker'
  excludeWeekId?: string
}

export interface GetAdminMealsOutput {
  meals: Array<{
    meal_id: string
    name_en: string
    name_ar?: string
    meal_type: string
    kcal: number
    status: string
    already_used: boolean | null
    used_on_day: string | null
  }>
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export function makeUC(deps: Deps) {
  return async function getAdminMeals(input: GetAdminMealsInput): Promise<GetAdminMealsOutput> {
    const { logger, mealLoader } = deps

    try {
      const page = Math.max(1, input.page ?? 1)
      const perPage = Math.min(50, Math.max(1, input.perPage ?? 20))
      const isPicker = input.context === 'picker'

      const { meals, total } = await mealLoader.getMeals({
        status: isPicker ? 'active' : (input.status ?? 'all'),
        mealType: input.mealType ?? 'all',
        q: input.q,
        page,
        perPage,
        excludeWeekId: input.excludeWeekId,
      })

      return {
        meals: meals.map(m => ({
          meal_id: m.id,
          name_en: m.nameEn,
          name_ar: m.nameAr,
          meal_type: m.mealType,
          kcal: m.kcal,
          status: m.status,
          already_used: input.excludeWeekId ? (m.alreadyUsed ?? false) : null,
          used_on_day: input.excludeWeekId ? (m.usedOnDay ?? null) : null,
        })),
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      }
    } catch (error) {
      logger.error('GetAdminMeals failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetAdminMeals'
