import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import type { MealLoader, MealPersistor, CreateMealInput, ImportError, MealWithUsage } from '../../core/entitygateway/Meal.js'
import type { Meal } from '../../core/entities/Meal.js'
import { MealModel, MenuSlotModel } from './models/index.js'

@Injectable()
export class MealPersistenceService implements MealLoader, MealPersistor {
  async getMealById(id: string): Promise<Meal | null> {
    const model = await MealModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  async getMeals(filters: {
    status?: 'draft' | 'active' | 'all'
    mealType?: 'executive' | 'salad' | 'all'
    q?: string
    page?: number
    perPage?: number
    excludeWeekId?: string
  }): Promise<{ meals: MealWithUsage[]; total: number }> {
    const where: Record<string, unknown> = {}

    if (filters.status && filters.status !== 'all') {
      where['status'] = filters.status
    }
    if (filters.mealType && filters.mealType !== 'all') {
      where['mealType'] = filters.mealType
    }
    if (filters.q) {
      where[Op.or as unknown as string] = [
        { nameEn: { [Op.iLike]: `%${filters.q}%` } },
        { nameAr: { [Op.iLike]: `%${filters.q}%` } },
      ]
    }

    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const { rows, count } = await MealModel.findAndCountAll({
      where,
      order: [['activatedAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
      limit: perPage,
      offset,
    })

    // Determine already_used status for each meal in excludeWeekId
    let usedMealMap = new Map<string, string>()
    if (filters.excludeWeekId) {
      const slots = await MenuSlotModel.findAll({
        where: { weekId: filters.excludeWeekId },
        attributes: ['mealId', 'deliveryDate', 'mealType'],
      })
      for (const slot of slots) {
        if (slot.mealId) {
          const d = new Date(slot.deliveryDate)
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          usedMealMap.set(slot.mealId, days[d.getDay()])
        }
      }
    }

    const meals: MealWithUsage[] = rows.map(m => ({
      ...this.toEntity(m),
      alreadyUsed: filters.excludeWeekId ? usedMealMap.has(m.id) : undefined,
      usedOnDay: filters.excludeWeekId ? (usedMealMap.get(m.id) ?? null) : undefined,
    }))

    return { meals, total: count }
  }

  async getMealsByIds(ids: string[]): Promise<Meal[]> {
    if (ids.length === 0) return []
    const models = await MealModel.findAll({ where: { id: ids } })
    return models.map(m => this.toEntity(m))
  }

  async getMealsInWeek(weekId: string): Promise<{ mealId: string; dayLabel: string }[]> {
    const slots = await MenuSlotModel.findAll({
      where: { weekId },
      attributes: ['mealId', 'deliveryDate'],
    })
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return slots
      .filter(s => s.mealId)
      .map(s => ({
        mealId: s.mealId as string,
        dayLabel: days[new Date(s.deliveryDate).getDay()],
      }))
  }

  async createMeal(input: CreateMealInput): Promise<Meal> {
    const model = await MealModel.create({
      nameEn: input.nameEn,
      nameAr: input.nameAr ?? null,
      mealType: input.mealType,
      kcal: input.kcal,
      proteinG: input.proteinG ?? null,
      carbsG: input.carbsG ?? null,
      fatG: input.fatG ?? null,
      chefNote: input.chefNote ?? null,
      keyIngredients: input.keyIngredients ?? null,
      emoji: input.emoji ?? '🍛',
      status: 'draft',
    })
    return this.toEntity(model)
  }

  async updateMeal(id: string, updates: Partial<Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Meal> {
    const model = await MealModel.findByPk(id)
    if (!model) throw new Error(`Meal ${id} not found`)

    const fieldsToUpdate: Record<string, unknown> = {}
    if (updates.nameEn !== undefined) fieldsToUpdate['nameEn'] = updates.nameEn
    if (updates.nameAr !== undefined) fieldsToUpdate['nameAr'] = updates.nameAr
    if (updates.mealType !== undefined) fieldsToUpdate['mealType'] = updates.mealType
    if (updates.kcal !== undefined) fieldsToUpdate['kcal'] = updates.kcal
    if (updates.proteinG !== undefined) fieldsToUpdate['proteinG'] = updates.proteinG
    if (updates.carbsG !== undefined) fieldsToUpdate['carbsG'] = updates.carbsG
    if (updates.fatG !== undefined) fieldsToUpdate['fatG'] = updates.fatG
    if (updates.chefNote !== undefined) fieldsToUpdate['chefNote'] = updates.chefNote
    if (updates.keyIngredients !== undefined) fieldsToUpdate['keyIngredients'] = updates.keyIngredients
    if (updates.emoji !== undefined) fieldsToUpdate['emoji'] = updates.emoji
    if (updates.photoUrl !== undefined) fieldsToUpdate['photoUrl'] = updates.photoUrl

    await model.update(fieldsToUpdate)
    return this.toEntity(model)
  }

  async updateMealStatus(id: string, status: 'active' | 'draft'): Promise<Meal> {
    const model = await MealModel.findByPk(id)
    if (!model) throw new Error(`Meal ${id} not found`)
    const activatedAt = status === 'active' && !model.activatedAt ? new Date() : model.activatedAt
    await model.update({ status, activatedAt })
    return this.toEntity(model)
  }

  async bulkCreateMeals(meals: CreateMealInput[]): Promise<{ created: Meal[]; skipped: number; errors: ImportError[] }> {
    const created: Meal[] = []
    const errors: ImportError[] = []
    let skipped = 0

    for (let i = 0; i < meals.length; i++) {
      try {
        const meal = await this.createMeal(meals[i])
        created.push(meal)
      } catch (err) {
        skipped++
        errors.push({
          row: i + 2,
          field: 'unknown',
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return { created, skipped, errors }
  }

  async incrementTimesServed(mealIds: string[]): Promise<void> {
    if (mealIds.length === 0) return
    await MealModel.increment('timesServed', { where: { id: mealIds } })
  }

  async updateLastServed(mealIds: string[], date: string): Promise<void> {
    if (mealIds.length === 0) return
    await MealModel.update({ lastServed: date }, { where: { id: mealIds } })
  }

  private toEntity(model: MealModel): Meal {
    return {
      id: model.id,
      nameEn: model.nameEn,
      nameAr: model.nameAr ?? undefined,
      mealType: model.mealType,
      kcal: model.kcal,
      proteinG: model.proteinG != null ? Number(model.proteinG) : undefined,
      carbsG: model.carbsG != null ? Number(model.carbsG) : undefined,
      fatG: model.fatG != null ? Number(model.fatG) : undefined,
      chefNote: model.chefNote ?? undefined,
      keyIngredients: model.keyIngredients ?? undefined,
      emoji: model.emoji,
      status: model.status,
      photoUrl: model.photoUrl ?? undefined,
      activatedAt: model.activatedAt ?? undefined,
      lastServed: model.lastServed ?? undefined,
      timesServed: model.timesServed,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
