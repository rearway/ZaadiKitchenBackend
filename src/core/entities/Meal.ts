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
  status: 'draft' | 'active'
  photoUrl?: string
  activatedAt?: Date
  lastServed?: string
  timesServed: number
  createdAt: Date
  updatedAt: Date
}
