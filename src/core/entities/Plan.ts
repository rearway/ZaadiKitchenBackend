export interface Plan {
  id: string
  name: string
  slug: string
  priceSar: number
  /** Pre-discount price shown struck-through in the app; null when there is no discount. */
  maxPriceSar: number | null
  mealCount: number
  pricePerMealSar: number
  skipDaysAllowed: number
  pauseDaysAllowed: number
  isMostPopular: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
