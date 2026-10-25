import { Op } from 'sequelize'
import { MealModel } from '../models/MealModel'
import { MenuSlotModel } from '../models/MenuSlotModel'
import { MealPersistenceService } from '../meal-persistence.service'
import { MenuWeekPersistenceService } from '../menu-week-persistence.service'
import { ErpIntegrationPersistenceService } from '../erp-integration-persistence.service'

describe('meal soft-delete filters', () => {
  const meals = new MealPersistenceService()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('lists only meals with deletedAt null', async () => {
    const findAndCountAll = jest
      .spyOn(MealModel, 'findAndCountAll')
      .mockResolvedValue({ rows: [], count: 0 } as never)

    await meals.getMeals({ status: 'all', q: 'chicken' })

    const where = findAndCountAll.mock.calls[0][0].where as {
      deletedAt?: null
    }
    expect(where.deletedAt).toBeNull()
  })

  it('loads a meal by id only when it is not soft-deleted', async () => {
    const findOne = jest.spyOn(MealModel, 'findOne').mockResolvedValue(null)

    await expect(meals.getMealById('meal-1')).resolves.toBeNull()

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'meal-1', deletedAt: null },
    })
  })

  it('loads meals by name and id list only when deletedAt is null', async () => {
    const findOne = jest.spyOn(MealModel, 'findOne').mockResolvedValue(null)
    const findAll = jest
      .spyOn(MealModel, 'findAll')
      .mockResolvedValue([] as never)

    await meals.getMealByName('Chicken', 'meal-keep')
    await meals.getMealsByIds(['meal-1', 'meal-2'])

    expect(findOne).toHaveBeenCalledWith({
      where: {
        nameEn: { [Op.iLike]: 'Chicken' },
        deletedAt: null,
        id: { [Op.ne]: 'meal-keep' },
      },
    })
    expect(findAll).toHaveBeenCalledWith({
      where: { id: ['meal-1', 'meal-2'], deletedAt: null },
    })
  })

  it('sets deletedAt and does not hard-delete the meal row', async () => {
    const update = jest.fn().mockResolvedValue(undefined)
    jest.spyOn(MealModel, 'findOne').mockResolvedValue({ update } as never)
    const destroy = jest.spyOn(MealModel, 'destroy').mockResolvedValue(0)

    const deletedAt = await meals.softDeleteMeal('meal-1')

    expect(deletedAt).toBeInstanceOf(Date)
    expect(update).toHaveBeenCalledWith({ deletedAt })
    expect(destroy).not.toHaveBeenCalled()
  })

  it('hides soft-deleted meals on the customer menu', async () => {
    const findAll = jest
      .spyOn(MenuSlotModel, 'findAll')
      .mockResolvedValue([] as never)
    const menu = new MenuWeekPersistenceService()

    await menu.getMenuForDateRange('2026-10-25', '2026-10-31')

    const include = findAll.mock.calls[0][0].include as Array<{
      as?: string
      required?: boolean
      where?: { deletedAt: null }
    }>
    expect(include).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          as: 'Meal',
          required: false,
          where: { deletedAt: null },
        }),
      ])
    )
  })

  it('hides soft-deleted meals from the ERP menu list', async () => {
    const findAndCountAll = jest
      .spyOn(MealModel, 'findAndCountAll')
      .mockResolvedValue({ rows: [], count: 0 } as never)
    const erp = new ErpIntegrationPersistenceService()

    await erp.getMenus(0, 20)

    expect(findAndCountAll.mock.calls[0][0].where).toEqual({ deletedAt: null })
  })
})
