import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import type { MenuWeekLoader, MenuWeekPersistor, EnsureWeekParams } from '../../core/entitygateway/MenuWeek.js'
import type { MenuWeek } from '../../core/entities/MenuWeek.js'
import type { MenuSlot, MenuSlotWithMeal } from '../../core/entities/MenuSlot.js'
import { MenuWeekModel, MenuSlotModel, MealModel } from './models/index.js'
import { makeSlotId } from '../../core/usecases/services/weekUtils.js'

@Injectable()
export class MenuWeekPersistenceService implements MenuWeekLoader, MenuWeekPersistor {
  async getWeekById(weekId: string): Promise<MenuWeek | null> {
    const model = await MenuWeekModel.findByPk(weekId)
    return model ? this.toWeekEntity(model) : null
  }

  async getWeeks(filters: { fromWeek?: string; count?: number }): Promise<MenuWeek[]> {
    const count = filters.count ?? 2
    const where: Record<string, unknown> = {}

    if (filters.fromWeek) {
      where['id'] = { [Op.gte]: filters.fromWeek }
    }

    const models = await MenuWeekModel.findAll({
      where,
      order: [['date_from', 'ASC']],
      limit: count,
    })

    return models.map(m => this.toWeekEntity(m))
  }

  async getSlotsByWeekId(weekId: string): Promise<MenuSlot[]> {
    const models = await MenuSlotModel.findAll({
      where: { weekId },
      order: [['delivery_date', 'ASC'], ['meal_type', 'ASC']],
    })
    return models.map(m => this.toSlotEntity(m))
  }

  async getSlotById(slotId: string): Promise<MenuSlot | null> {
    const model = await MenuSlotModel.findByPk(slotId)
    return model ? this.toSlotEntity(model) : null
  }

  async getMenuForDateRange(from: string, to: string): Promise<MenuSlotWithMeal[]> {
    const slots = await MenuSlotModel.findAll({
      include: [
        {
          model: MealModel,
          as: 'Meal',
          required: false,
          where: { deletedAt: null },
        },
        {
          model: MenuWeekModel,
          as: 'MenuWeek',
          required: true,
          where: { status: 'published' },
        },
      ],
      where: {
        deliveryDate: { [Op.between]: [from, to] },
      },
      order: [['deliveryDate', 'ASC'], ['mealType', 'ASC']],
    } as Parameters<typeof MenuSlotModel.findAll>[0])

    return slots.map(s => {
      const mealModel = (s as MenuSlotModel & { Meal?: MealModel }).Meal
      const slot = this.toSlotEntity(s)
      if (!mealModel || mealModel.deletedAt) return slot as MenuSlotWithMeal

      return {
        ...slot,
        meal: {
          id: mealModel.id,
          nameEn: mealModel.nameEn,
          nameAr: mealModel.nameAr ?? undefined,
          mealType: mealModel.mealType,
          kcal: mealModel.kcal,
          proteinG: mealModel.proteinG != null ? Number(mealModel.proteinG) : undefined,
          carbsG: mealModel.carbsG != null ? Number(mealModel.carbsG) : undefined,
          fatG: mealModel.fatG != null ? Number(mealModel.fatG) : undefined,
          chefNote: mealModel.chefNote ?? undefined,
          keyIngredients: mealModel.keyIngredients ?? undefined,
          emoji: mealModel.emoji,
          status: mealModel.status,
          photoUrl: mealModel.photoUrl ?? undefined,
          activatedAt: mealModel.activatedAt ?? undefined,
          lastServed: mealModel.lastServed ?? undefined,
          timesServed: mealModel.timesServed,
          createdAt: mealModel.createdAt,
          updatedAt: mealModel.updatedAt,
        },
      } as MenuSlotWithMeal
    })
  }

  async ensureWeekExists(params: EnsureWeekParams): Promise<{ week: MenuWeek; slots: MenuSlot[] }> {
    const [week] = await MenuWeekModel.findOrCreate({
      where: { id: params.weekId },
      defaults: {
        id: params.weekId,
        weekNumber: params.weekNumber,
        year: params.year,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        status: 'draft',
      },
    })

    const existingSlots = await MenuSlotModel.findAll({ where: { weekId: params.weekId } })
    const existingIds = new Set(existingSlots.map(s => s.id))

    const mealTypes: Array<'executive' | 'salad'> = ['executive', 'salad']
    const newSlots: MenuSlotModel[] = []

    for (const date of params.deliveryDates) {
      for (const type of mealTypes) {
        const slotId = makeSlotId(params.weekId, date, type)
        if (!existingIds.has(slotId)) {
          const slot = await MenuSlotModel.create({
            id: slotId,
            weekId: params.weekId,
            deliveryDate: date,
            mealType: type,
            mealId: null,
            isDefault: false,
          })
          newSlots.push(slot)
        }
      }
    }

    const allSlots = [...existingSlots, ...newSlots]
    return {
      week: this.toWeekEntity(week),
      slots: allSlots.map(s => this.toSlotEntity(s)),
    }
  }

  async createSlot(slot: {
    id: string
    weekId: string
    deliveryDate: string
    mealType: 'executive' | 'salad'
    mealId?: string | null
    isDefault?: boolean
  }): Promise<MenuSlot> {
    const model = await MenuSlotModel.create({
      id: slot.id,
      weekId: slot.weekId,
      deliveryDate: slot.deliveryDate,
      mealType: slot.mealType,
      mealId: slot.mealId ?? null,
      isDefault: slot.isDefault ?? false,
    })
    return this.toSlotEntity(model)
  }

  async setDayDefault(
    weekId: string,
    deliveryDate: string,
    mealType: 'executive' | 'salad',
    mealId: string
  ): Promise<MenuSlot> {
    const target = await MenuSlotModel.findOne({
      where: { weekId, deliveryDate, mealType, mealId },
    })
    if (!target) throw new Error('Default meal is not assigned on this day')

    await MenuSlotModel.update(
      { isDefault: false },
      { where: { weekId, deliveryDate, mealType, isDefault: true } }
    )
    await target.update({ isDefault: true })
    return this.toSlotEntity(target)
  }

  async deleteSlot(slotId: string): Promise<void> {
    await MenuSlotModel.destroy({ where: { id: slotId } })
  }

  async assignMealToSlot(slotId: string, mealId: string): Promise<MenuSlot> {
    const slot = await MenuSlotModel.findByPk(slotId)
    if (!slot) throw new Error(`MenuSlot ${slotId} not found`)

    const otherDefault = await MenuSlotModel.findOne({
      where: {
        weekId: slot.weekId,
        deliveryDate: slot.deliveryDate,
        mealType: slot.mealType,
        isDefault: true,
        id: { [Op.ne]: slot.id },
      },
    })
    await slot.update({
      mealId,
      isDefault: slot.isDefault || !otherDefault,
    })
    return this.toSlotEntity(slot)
  }

  async clearSlot(slotId: string): Promise<MenuSlot> {
    const slot = await MenuSlotModel.findByPk(slotId)
    if (!slot) throw new Error(`MenuSlot ${slotId} not found`)
    await slot.update({ mealId: null, isDefault: false })
    return this.toSlotEntity(slot)
  }

  async publishWeek(weekId: string, publishedBy: string): Promise<MenuWeek> {
    const week = await MenuWeekModel.findByPk(weekId)
    if (!week) throw new Error(`MenuWeek ${weekId} not found`)
    await week.update({ status: 'published', publishedAt: new Date(), publishedBy })
    return this.toWeekEntity(week)
  }

  async unpublishWeek(weekId: string): Promise<MenuWeek> {
    const week = await MenuWeekModel.findByPk(weekId)
    if (!week) throw new Error(`MenuWeek ${weekId} not found`)
    await week.update({ status: 'draft', publishedAt: null, publishedBy: null })
    return this.toWeekEntity(week)
  }

  async transitionPastWeeks(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    await MenuWeekModel.update(
      { status: 'past' },
      { where: { status: 'published', dateTo: { [Op.lt]: today } } }
    )
  }

  private toWeekEntity(model: MenuWeekModel): MenuWeek {
    return {
      id: model.id,
      weekNumber: model.weekNumber,
      year: model.year,
      dateFrom: model.dateFrom,
      dateTo: model.dateTo,
      status: model.status,
      publishedAt: model.publishedAt ?? undefined,
      publishedBy: model.publishedBy ?? undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  private toSlotEntity(model: MenuSlotModel): MenuSlot {
    return {
      id: model.id,
      weekId: model.weekId,
      deliveryDate: model.deliveryDate,
      mealType: model.mealType,
      mealId: model.mealId ?? undefined,
      isDefault: model.isDefault,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
