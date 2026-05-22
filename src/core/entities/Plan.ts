export interface Plan {
  id: string
  name: string
  slug: string
  priceSar: number
  mealCount: number
  pricePerMealSar: number
  skipDaysAllowed: number
  pauseDaysAllowed: number
  isMostPopular: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
