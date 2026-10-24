import type { Meal, MealPendingChanges } from '../../entities/Meal.js'

export type MealFieldUpdates = {
  nameEn?: string
  nameAr?: string
  mealType?: 'executive' | 'salad'
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  chefNote?: string
  keyIngredients?: string[]
  emoji?: string
  photoUrl?: string
}

export function hasMealFieldUpdates(updates: MealFieldUpdates): boolean {
  return (
    updates.nameEn !== undefined ||
    updates.nameAr !== undefined ||
    updates.mealType !== undefined ||
    updates.kcal !== undefined ||
    updates.proteinG !== undefined ||
    updates.carbsG !== undefined ||
    updates.fatG !== undefined ||
    updates.chefNote !== undefined ||
    updates.keyIngredients !== undefined ||
    updates.emoji !== undefined ||
    updates.photoUrl !== undefined
  )
}

export function snapshotMealFields(
  meal: Meal,
  pending?: MealPendingChanges | null
): MealPendingChanges {
  return {
    nameEn: pending?.nameEn ?? meal.nameEn,
    nameAr: pending?.nameAr ?? meal.nameAr,
    mealType: pending?.mealType ?? meal.mealType,
    kcal: pending?.kcal ?? meal.kcal,
    proteinG: pending?.proteinG ?? meal.proteinG,
    carbsG: pending?.carbsG ?? meal.carbsG,
    fatG: pending?.fatG ?? meal.fatG,
    chefNote: pending?.chefNote ?? meal.chefNote,
    keyIngredients: pending?.keyIngredients ?? meal.keyIngredients,
    emoji: pending?.emoji ?? meal.emoji,
    photoUrl: pending?.photoUrl ?? meal.photoUrl,
  }
}

export function mergeMealUpdates(
  base: MealPendingChanges,
  updates: MealFieldUpdates
): MealPendingChanges {
  const next: MealPendingChanges = { ...base }
  if (updates.nameEn !== undefined) next.nameEn = updates.nameEn
  if (updates.nameAr !== undefined) next.nameAr = updates.nameAr
  if (updates.mealType !== undefined) next.mealType = updates.mealType
  if (updates.kcal !== undefined) next.kcal = updates.kcal
  if (updates.proteinG !== undefined) next.proteinG = updates.proteinG
  if (updates.carbsG !== undefined) next.carbsG = updates.carbsG
  if (updates.fatG !== undefined) next.fatG = updates.fatG
  if (updates.chefNote !== undefined) next.chefNote = updates.chefNote
  if (updates.keyIngredients !== undefined)
    next.keyIngredients = updates.keyIngredients
  if (updates.emoji !== undefined) next.emoji = updates.emoji
  if (updates.photoUrl !== undefined) next.photoUrl = updates.photoUrl
  return next
}

export function pendingToLiveUpdates(
  pending: MealPendingChanges
): MealFieldUpdates {
  const updates: MealFieldUpdates = {}
  if (pending.nameEn !== undefined) updates.nameEn = pending.nameEn
  if (pending.nameAr !== undefined) updates.nameAr = pending.nameAr
  if (pending.mealType !== undefined) updates.mealType = pending.mealType
  if (pending.kcal !== undefined) updates.kcal = pending.kcal
  if (pending.proteinG !== undefined) updates.proteinG = pending.proteinG
  if (pending.carbsG !== undefined) updates.carbsG = pending.carbsG
  if (pending.fatG !== undefined) updates.fatG = pending.fatG
  if (pending.chefNote !== undefined) updates.chefNote = pending.chefNote
  if (pending.keyIngredients !== undefined)
    updates.keyIngredients = pending.keyIngredients
  if (pending.emoji !== undefined) updates.emoji = pending.emoji
  if (pending.photoUrl !== undefined) updates.photoUrl = pending.photoUrl
  return updates
}

export function toPendingApi(pending: MealPendingChanges | null | undefined) {
  if (!pending) return null
  return {
    name_en: pending.nameEn,
    name_ar: pending.nameAr,
    kcal: pending.kcal,
    macros: {
      protein_g: pending.proteinG,
      carbs_g: pending.carbsG,
      fat_g: pending.fatG,
    },
    chef_note: pending.chefNote,
    key_ingredients: pending.keyIngredients,
    emoji: pending.emoji,
    photo_url: pending.photoUrl ?? null,
  }
}
