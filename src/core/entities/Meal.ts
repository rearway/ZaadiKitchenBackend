export type MealStatus = 'draft' | 'active' | 'updated'

export interface MealPendingChanges {
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

export interface Meal {
  id: string
  nameEn: string
  nameAr?: string
  mealType: 'executive' | 'salad'
  kcal: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  chefNote?: string
  keyIngredients?: string[]
  emoji: string
  status: MealStatus
  erpCode: string
  photoUrl?: string
  activatedAt?: Date
  lastServed?: string
  timesServed: number
  pendingChanges?: MealPendingChanges | null
  createdAt: Date
  updatedAt: Date
}
