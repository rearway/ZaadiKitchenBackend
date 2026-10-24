import { MealRating, RatingTag } from '../entities/MealRating.js'

export interface PendingRatingDay {
  deliveryDayId: string
  deliveryDate: string
  mealId: string
  mealName: string
  mealType: string
  kcal: number
  emoji: string
  photoUrl: string | null
}

export interface MealRatingPersistor {
  createRating(
    input: Omit<MealRating, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MealRating>
}

export interface AdminMealRatingRow {
  id: string
  userId: string
  phone: string | null
  fullName: string | null
  stars: number
  tags: RatingTag[]
  deliveryDate: string
  createdAt: Date
}

export interface MealRatingsByMeal {
  ratings: AdminMealRatingRow[]
  total: number
  averageRating: number | null
}

export interface MealRatingLoader {
  getRatingByDeliveryDay(
    userId: string,
    deliveryDayId: string
  ): Promise<MealRating | null>
  getPendingRatingDays(
    userId: string,
    subscriptionId: string,
    limit: number
  ): Promise<PendingRatingDay[]>
  getPendingRatingCount(userId: string, subscriptionId: string): Promise<number>
  getRatingsByUser(
    userId: string,
    page: number,
    perPage: number
  ): Promise<{ ratings: MealRating[]; total: number }>
  getRatingsByMeal(
    mealId: string,
    page: number,
    perPage: number
  ): Promise<MealRatingsByMeal>
}
