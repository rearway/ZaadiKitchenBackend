import { resolveEffectiveMeal } from '../resolveEffectiveMeal'
import type { Meal } from '../../../entities/Meal.js'
import type { EffectiveMealSlot } from '../resolveEffectiveMeal'

function makeMeal(id: string, mealType: 'executive' | 'salad', overrides: Partial<Meal> = {}): Meal {
  return {
    id,
    nameEn: id,
    mealType,
    status: 'active',
    kcal: 500,
    emoji: '🍛',
    erpCode: `ERP-${id}`,
    timesServed: 0,
    pendingChanges: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function slot(
  meal: Meal,
  overrides: Partial<EffectiveMealSlot> = {}
): EffectiveMealSlot {
  return {
    mealType: meal.mealType,
    mealId: meal.id,
    meal,
    isDefault: false,
    ...overrides,
  }
}

describe('resolveEffectiveMeal', () => {
  const execA = makeMeal('exec-a', 'executive')
  const execB = makeMeal('exec-b', 'executive')
  const saladA = makeMeal('salad-a', 'salad')

  it('returns the selected dish when it is a valid option for that stream', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      selectedMealId: execB.id,
      slots: [slot(execA, { isDefault: true }), slot(execB), slot(saladA, { isDefault: true })],
    })

    expect(result?.id).toBe('exec-b')
  })

  it('ignores a selected dish that is not in the stream options and uses the default', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      selectedMealId: saladA.id,
      slots: [slot(execA, { isDefault: true }), slot(execB), slot(saladA)],
    })

    expect(result?.id).toBe('exec-a')
  })

  it('uses the default dish when the customer has not selected', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      selectedMealId: null,
      slots: [slot(execA), slot(execB, { isDefault: true })],
    })

    expect(result?.id).toBe('exec-b')
  })

  it('uses the only filled dish in the stream when there is no default', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      selectedMealId: null,
      slots: [slot(execA), slot(saladA, { isDefault: true })],
    })

    expect(result?.id).toBe('exec-a')
  })

  it('falls back to the first filled dish when several exist and none is default', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      selectedMealId: null,
      slots: [slot(execB), slot(execA)],
    })

    expect(result?.id).toBe('exec-b')
  })

  it('returns live fields and does not apply pendingChanges', () => {
    const live = makeMeal('exec-a', 'executive', {
      nameEn: 'Live Name',
      kcal: 500,
      status: 'updated',
      pendingChanges: { nameEn: 'Pending Name', kcal: 900 },
    })

    const result = resolveEffectiveMeal({
      mealType: 'executive',
      slots: [slot(live, { isDefault: true })],
    })

    expect(result?.nameEn).toBe('Live Name')
    expect(result?.kcal).toBe(500)
  })

  it('skips empty slots', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      slots: [
        { mealType: 'executive', mealId: undefined, meal: undefined, isDefault: true },
        slot(execA),
      ],
    })

    expect(result?.id).toBe('exec-a')
  })

  it('returns null when the stream has no filled dishes', () => {
    const result = resolveEffectiveMeal({
      mealType: 'executive',
      selectedMealId: execA.id,
      slots: [slot(saladA, { isDefault: true })],
    })

    expect(result).toBeNull()
  })
})
