export const RATING_TAGS = [
  'Great portion',
  'Too spicy',
  'Too salty',
  'Small portion',
] as const
export type RatingTag = (typeof RATING_TAGS)[number]

export interface MealRating {
  id: string
  userId: string
  subscriptionId: string
  deliveryDayId: string
  mealId: string
  deliveryDate: string
  stars: number
  tags: RatingTag[]
  createdAt: Date
  updatedAt: Date
}
