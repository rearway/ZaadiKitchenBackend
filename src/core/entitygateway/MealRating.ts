import { MealRating, RatingTag } from '../entities/MealRating.js'

export interface PendingRatingDay {
  deliveryDayId: string
  deliveryDate: string
  mealId: string
  mealName: string
  mealType: string
  kcal: number
  emoji: string
}

export interface MealRatingPersistor {
  createRating(input: Omit<MealRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<MealRating>
}

export interface MealRatingLoader {
  getRatingByDeliveryDay(userId: string, deliveryDayId: string): Promise<MealRating | null>
  getPendingRatingDays(userId: string, subscriptionId: string, limit: number): Promise<PendingRatingDay[]>
  getRatingsByUser(userId: string, page: number, perPage: number): Promise<{ ratings: MealRating[]; total: number }>
}
