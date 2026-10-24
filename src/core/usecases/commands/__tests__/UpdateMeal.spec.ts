import { makeUC } from '../UpdateMeal'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    nameEn: 'Grilled Chicken',
    nameAr: 'دجاج',
    mealType: 'executive',
    kcal: 500,
    proteinG: 40,
    carbsG: 20,
    fatG: 10,
    chefNote: 'note',
    keyIngredients: ['chicken'],
    emoji: '🍛',
    status: 'active',
    erpCode: 'ERP-1',
    photoUrl: 'https://img/chicken.jpg',
    timesServed: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    pendingChanges: null,
    ...overrides,
  }
}

function setup(meal: Meal | null) {
  const deps = buildDeps()
  jest.mocked(deps.mealLoader.getMealById).mockResolvedValue(meal)
  jest.mocked(deps.mealLoader.getMealByName).mockResolvedValue(null)
  jest.mocked(deps.mealPersistor.updateMeal).mockImplementation(async (_id, updates) => ({
    ...(meal as Meal),
    ...updates,
  }))
  return { update: makeUC(deps), deps }
}

describe('UpdateMeal', () => {
  it('applies field updates immediately on a draft meal', async () => {
    const meal = makeMeal({ status: 'draft' })
    const { update, deps } = setup(meal)

    const result = await update({ mealId: meal.id, kcal: 560, chefNote: 'slow cooked' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({ kcal: 560, chefNote: 'slow cooked' })
    )
    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.not.objectContaining({ status: 'updated' })
    )
    expect(result.data.status).toBe('draft')
  })

  it('stores pending changes and sets updated without changing live fields on an active meal', async () => {
    const meal = makeMeal({ status: 'active' })
    const { update, deps } = setup(meal)

    await update({ mealId: meal.id, kcal: 560, chefNote: 'slow cooked' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'updated',
        pendingChanges: expect.objectContaining({
          kcal: 560,
          chefNote: 'slow cooked',
          nameEn: 'Grilled Chicken',
        }),
      })
    )
    const saved = jest.mocked(deps.mealPersistor.updateMeal).mock.calls[0][1]
    expect(saved.kcal).toBeUndefined()
    expect(saved.nameEn).toBeUndefined()
  })

  it('does not require confirm_published_edit when editing an active meal on a published week', async () => {
    const meal = makeMeal({ status: 'active' })
    const { update, deps } = setup(meal)
    jest.mocked(deps.menuWeekLoader.getMenuForDateRange).mockResolvedValue([
      {
        id: 's1',
        weekId: 'w2026-42',
        mealId: meal.id,
        deliveryDate: '2026-10-17',
        mealType: 'executive',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    await expect(update({ mealId: meal.id, kcal: 560 })).resolves.toBeDefined()
    expect(deps.mealPersistor.updateMeal).toHaveBeenCalled()
  })

  it('merges further edits into pending on an already updated meal', async () => {
    const meal = makeMeal({
      status: 'updated',
      pendingChanges: {
        nameEn: 'Grilled Chicken',
        nameAr: 'دجاج',
        kcal: 560,
        proteinG: 40,
        carbsG: 20,
        fatG: 10,
        chefNote: 'slow cooked',
        keyIngredients: ['chicken'],
        emoji: '🍛',
        photoUrl: 'https://img/chicken.jpg',
      },
    })
    const { update, deps } = setup(meal)

    await update({ mealId: meal.id, nameEn: 'Lemon Chicken' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'updated',
        pendingChanges: expect.objectContaining({
          nameEn: 'Lemon Chicken',
          kcal: 560,
          chefNote: 'slow cooked',
        }),
      })
    )
  })

  it('persists mealType immediately when a draft meal changes from executive to salad', async () => {
    const meal = makeMeal({ status: 'draft', mealType: 'executive' })
    const { update, deps } = setup(meal)

    const result = await update({ mealId: meal.id, mealType: 'salad' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({ mealType: 'salad' })
    )
    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.not.objectContaining({ status: 'updated' })
    )
    expect(result.data.mealType).toBe('salad')
    expect(result.data.status).toBe('draft')
  })

  it('persists mealType immediately when a draft meal changes from salad to executive', async () => {
    const meal = makeMeal({ status: 'draft', mealType: 'salad' })
    const { update, deps } = setup(meal)

    const result = await update({ mealId: meal.id, mealType: 'executive' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({ mealType: 'executive' })
    )
    expect(result.data.mealType).toBe('executive')
    expect(result.data.status).toBe('draft')
  })

  it('stores an executive-to-salad change as pending and leaves the live type unchanged', async () => {
    const meal = makeMeal({ status: 'active', mealType: 'executive' })
    const { update, deps } = setup(meal)

    await update({ mealId: meal.id, mealType: 'salad' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'updated',
        pendingChanges: expect.objectContaining({
          mealType: 'salad',
          nameEn: 'Grilled Chicken',
        }),
      })
    )
    const saved = jest.mocked(deps.mealPersistor.updateMeal).mock.calls[0][1]
    expect(saved.mealType).toBeUndefined()
    expect(saved.kcal).toBeUndefined()
  })

  it('stores a salad-to-executive change on an updated meal and keeps other pending fields', async () => {
    const meal = makeMeal({
      status: 'updated',
      mealType: 'salad',
      pendingChanges: {
        nameEn: 'Grilled Chicken',
        nameAr: 'دجاج',
        mealType: 'salad',
        kcal: 560,
        proteinG: 40,
        carbsG: 20,
        fatG: 10,
        chefNote: 'slow cooked',
        keyIngredients: ['chicken'],
        emoji: '🍛',
        photoUrl: 'https://img/chicken.jpg',
      },
    })
    const { update, deps } = setup(meal)

    await update({ mealId: meal.id, mealType: 'executive' })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'updated',
        pendingChanges: expect.objectContaining({
          mealType: 'executive',
          kcal: 560,
          chefNote: 'slow cooked',
        }),
      })
    )
    const saved = jest.mocked(deps.mealPersistor.updateMeal).mock.calls[0][1]
    expect(saved.mealType).toBeUndefined()
  })

  it('keeps a pending mealType when a later edit changes another field', async () => {
    const meal = makeMeal({
      status: 'updated',
      mealType: 'executive',
      pendingChanges: {
        nameEn: 'Grilled Chicken',
        mealType: 'salad',
        kcal: 500,
      },
    })
    const { update, deps } = setup(meal)

    await update({ mealId: meal.id, kcal: 610 })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'updated',
        pendingChanges: expect.objectContaining({
          mealType: 'salad',
          kcal: 610,
        }),
      })
    )
    const saved = jest.mocked(deps.mealPersistor.updateMeal).mock.calls[0][1]
    expect(saved.mealType).toBeUndefined()
  })

  it('throws when the meal does not exist', async () => {
    const { update } = setup(null)

    await expect(update({ mealId: 'missing', kcal: 1 })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
