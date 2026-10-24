import { makeUC } from '../UpdateMealStatus'
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
    status: 'draft',
    erpCode: 'ERP-1',
    photoUrl: 'https://img/chicken.jpg',
    timesServed: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    pendingChanges: null,
    ...overrides,
  }
}

function setup(meal: Meal | null, publishedSlots: Array<{ weekId: string; mealId: string }> = []) {
  const deps = buildDeps()
  jest.mocked(deps.mealLoader.getMealById).mockResolvedValue(meal)
  jest.mocked(deps.mealLoader.getMealByName).mockResolvedValue(null)
  jest.mocked(deps.menuWeekLoader.getMenuForDateRange).mockResolvedValue(
    publishedSlots.map(s => ({
      id: `slot-${s.weekId}`,
      weekId: s.weekId,
      mealId: s.mealId,
      deliveryDate: '2026-10-17',
      mealType: 'executive' as const,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  )
  jest.mocked(deps.mealPersistor.updateMeal).mockImplementation(async (_id, updates) => ({
    ...(meal as Meal),
    ...updates,
    pendingChanges:
      updates.pendingChanges !== undefined
        ? updates.pendingChanges
        : (meal as Meal).pendingChanges,
    status: updates.status ?? (meal as Meal).status,
  }))
  jest.mocked(deps.mealPersistor.updateMealStatus).mockImplementation(async (_id, status) => ({
    ...(meal as Meal),
    status,
  }))
  return { updateStatus: makeUC(deps), deps }
}

describe('UpdateMealStatus', () => {
  it('activates a draft meal without confirmation', async () => {
    const meal = makeMeal({ status: 'draft' })
    const { updateStatus, deps } = setup(meal)

    const result = await updateStatus({ mealId: meal.id, status: 'active' })

    expect(deps.mealPersistor.updateMealStatus).toHaveBeenCalledWith(meal.id, 'active')
    expect(result.status).toBe('active')
    expect(result.previous_status).toBe('draft')
    expect(result.pending_applied).toBe(false)
  })

  it('requires confirm_published_edit before applying pending changes to the live menu', async () => {
    const meal = makeMeal({
      status: 'updated',
      pendingChanges: { nameEn: 'Lemon Chicken', kcal: 560 },
    })
    const { updateStatus, deps } = setup(meal, [{ weekId: 'w2026-42', mealId: meal.id }])

    await expect(
      updateStatus({ mealId: meal.id, status: 'active' })
    ).rejects.toMatchObject({
      errorCode: 'MEAL_IN_PUBLISHED_WEEK',
      statusCode: 409,
    })
    expect(deps.mealPersistor.updateMeal).not.toHaveBeenCalled()
  })

  it('applies pending fields to live and clears pending when activating with confirmation', async () => {
    const meal = makeMeal({
      status: 'updated',
      kcal: 500,
      nameEn: 'Grilled Chicken',
      pendingChanges: {
        nameEn: 'Lemon Chicken',
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
    const { updateStatus, deps } = setup(meal, [{ weekId: 'w2026-42', mealId: meal.id }])

    const result = await updateStatus({
      mealId: meal.id,
      status: 'active',
      confirmPublishedEdit: true,
    })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'active',
        nameEn: 'Lemon Chicken',
        kcal: 560,
        chefNote: 'slow cooked',
        pendingChanges: null,
      })
    )
    expect(result.status).toBe('active')
    expect(result.previous_status).toBe('updated')
    expect(result.pending_applied).toBe(true)
    expect(result.affects_live_menu).toBe(true)
    expect(result.affected_weeks).toEqual(['w2026-42'])
  })

  it('applies pending changes even when the meal is not currently on a published week, after confirmation', async () => {
    const meal = makeMeal({
      status: 'updated',
      pendingChanges: { nameEn: 'Lemon Chicken', kcal: 560 },
    })
    const { updateStatus, deps } = setup(meal, [])

    await expect(
      updateStatus({ mealId: meal.id, status: 'active' })
    ).rejects.toMatchObject({ errorCode: 'MEAL_IN_PUBLISHED_WEEK', statusCode: 409 })

    const result = await updateStatus({
      mealId: meal.id,
      status: 'active',
      confirmPublishedEdit: true,
    })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalled()
    expect(result.pending_applied).toBe(true)
    expect(result.affects_live_menu).toBe(false)
  })

  it('requires confirmation before drafting a meal on a published week', async () => {
    const meal = makeMeal({ status: 'active' })
    const { updateStatus, deps } = setup(meal, [{ weekId: 'w2026-42', mealId: meal.id }])

    await expect(
      updateStatus({ mealId: meal.id, status: 'draft' })
    ).rejects.toMatchObject({ errorCode: 'MEAL_IN_PUBLISHED_WEEK', statusCode: 409 })
    expect(deps.mealPersistor.updateMealStatus).not.toHaveBeenCalled()
  })

  it('applies a pending executive-to-salad type when activating with confirmation', async () => {
    const meal = makeMeal({
      status: 'updated',
      mealType: 'executive',
      pendingChanges: {
        nameEn: 'Grilled Chicken',
        mealType: 'salad',
        kcal: 560,
      },
    })
    const { updateStatus, deps } = setup(meal, [{ weekId: 'w2026-42', mealId: meal.id }])

    const result = await updateStatus({
      mealId: meal.id,
      status: 'active',
      confirmPublishedEdit: true,
    })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'active',
        mealType: 'salad',
        kcal: 560,
        pendingChanges: null,
      })
    )
    expect(result.pending_applied).toBe(true)
    expect(result.status).toBe('active')
  })

  it('applies a pending salad-to-executive type when activating with confirmation', async () => {
    const meal = makeMeal({
      status: 'updated',
      mealType: 'salad',
      pendingChanges: {
        mealType: 'executive',
      },
    })
    const { updateStatus, deps } = setup(meal, [])

    await updateStatus({
      mealId: meal.id,
      status: 'active',
      confirmPublishedEdit: true,
    })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({
        status: 'active',
        mealType: 'executive',
        pendingChanges: null,
      })
    )
  })

  it('clears pending when drafting an updated meal with confirmation', async () => {
    const meal = makeMeal({
      status: 'updated',
      pendingChanges: { nameEn: 'Lemon Chicken', kcal: 560 },
    })
    const { updateStatus, deps } = setup(meal, [{ weekId: 'w2026-42', mealId: meal.id }])

    await updateStatus({
      mealId: meal.id,
      status: 'draft',
      confirmPublishedEdit: true,
    })

    expect(deps.mealPersistor.updateMeal).toHaveBeenCalledWith(
      meal.id,
      expect.objectContaining({ status: 'draft', pendingChanges: null })
    )
  })
})
