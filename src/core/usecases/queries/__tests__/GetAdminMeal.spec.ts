import { makeUC } from '../GetAdminMeal'
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
    timesServed: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    pendingChanges: null,
    ...overrides,
  }
}

describe('GetAdminMeal', () => {
  it('returns live fields and null pending for an active meal', async () => {
    const deps = buildDeps()
    jest.mocked(deps.mealLoader.getMealById).mockResolvedValue(makeMeal())

    const result = await makeUC(deps)({ mealId: 'meal-1' })

    expect(result.status).toBe('active')
    expect(result.has_pending_changes).toBe(false)
    expect(result.pending).toBeNull()
    expect(result.name_en).toBe('Grilled Chicken')
  })

  it('returns pending preview while live fields stay unchanged for an updated meal', async () => {
    const deps = buildDeps()
    jest.mocked(deps.mealLoader.getMealById).mockResolvedValue(
      makeMeal({
        status: 'updated',
        pendingChanges: {
          nameEn: 'Lemon Chicken',
          kcal: 560,
          chefNote: 'slow cooked',
        },
      })
    )

    const result = await makeUC(deps)({ mealId: 'meal-1' })

    expect(result.status).toBe('updated')
    expect(result.has_pending_changes).toBe(true)
    expect(result.name_en).toBe('Grilled Chicken')
    expect(result.kcal).toBe(500)
    expect(result.pending).toMatchObject({
      name_en: 'Lemon Chicken',
      kcal: 560,
      chef_note: 'slow cooked',
    })
  })
})
