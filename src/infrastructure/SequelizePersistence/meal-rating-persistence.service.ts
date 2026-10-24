import { Injectable } from '@nestjs/common'
import { QueryTypes } from 'sequelize'
import {
  MealRatingPersistor,
  MealRatingLoader,
  PendingRatingDay,
  MealRatingsByMeal,
} from '../../core/entitygateway/MealRating.js'
import { MealRating, RatingTag } from '../../core/entities/MealRating.js'
import { MealRatingModel } from './models/MealRatingModel.js'
import { DeliveryDayModel } from './models/DeliveryDayModel.js'
import { resolveMealPhotoUrl } from '../../core/usecases/services/mealPhotoUtils.js'
import { effectiveMealLateralJoin } from './sql/effectiveMealJoin.js'

export const RATINGS_BY_MEAL_SUMMARY_SQL = `SELECT COUNT(*)::int AS rating_count,
       AVG(stars) AS average_rating
FROM meal_ratings
WHERE meal_id = :mealId`

export const RATINGS_BY_MEAL_LIST_SQL = `SELECT mr.id,
       mr.user_id,
       u.phone,
       u.full_name,
       mr.stars,
       mr.tags,
       mr.delivery_date,
       mr.created_at
FROM meal_ratings mr
LEFT JOIN users u ON u.id = mr.user_id
WHERE mr.meal_id = :mealId
ORDER BY mr.created_at DESC
LIMIT :limit OFFSET :offset`

/**
 * Delivered for rating: the rider marked the stop, or Daily Ops closed that
 * date. Rows stay until a meal_ratings row exists — there is no date window
 * that drops them when the pipeline day ends. Skipped and paused stops are
 * excluded from the ops-closed branch because those meals were not sent.
 */
export const PENDING_RATING_DELIVERED_SQL = `(
         dd.status = 'delivered'
         OR (
           dd.status IN ('scheduled', 'past_cutoff')
           AND EXISTS (
             SELECT 1
             FROM daily_ops_days ops
             WHERE ops.date = dd.date
               AND ops.delivered_at IS NOT NULL
           )
         )
       )`

export const PENDING_RATING_DAYS_SQL = `SELECT dd.id as delivery_day_id,
              dd.date as delivery_date,
              em.meal_id as meal_id,
              em.name_en as meal_name_en,
              em.meal_type,
              em.kcal,
              em.emoji,
              em.photo_url
       FROM delivery_days dd
       ${effectiveMealLateralJoin({ join: 'inner' })}
       LEFT JOIN meal_ratings mr ON mr.delivery_day_id = dd.id AND mr.user_id = :userId
       WHERE dd.subscription_id = :subscriptionId
         AND ${PENDING_RATING_DELIVERED_SQL}
         AND mr.id IS NULL
         AND em.meal_id IS NOT NULL
       ORDER BY dd.date DESC
       LIMIT :limit`

export const PENDING_RATING_COUNT_SQL = `SELECT COUNT(dd.id) as count
       FROM delivery_days dd
       LEFT JOIN meal_ratings mr ON mr.delivery_day_id = dd.id AND mr.user_id = :userId
       WHERE dd.subscription_id = :subscriptionId
         AND ${PENDING_RATING_DELIVERED_SQL}
         AND mr.id IS NULL`

@Injectable()
export class MealRatingPersistenceService
  implements MealRatingPersistor, MealRatingLoader
{
  async createRating(
    input: Omit<MealRating, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MealRating> {
    const model = await MealRatingModel.create({ ...input })
    return this.toEntity(model)
  }

  async getRatingByDeliveryDay(
    userId: string,
    deliveryDayId: string
  ): Promise<MealRating | null> {
    const model = await MealRatingModel.findOne({ where: { userId, deliveryDayId } })
    return model ? this.toEntity(model) : null
  }

  async getPendingRatingDays(
    userId: string,
    subscriptionId: string,
    limit: number
  ): Promise<PendingRatingDay[]> {
    // Delivered days that have no rating yet, most recent first
    const sequelize = DeliveryDayModel.sequelize!
    const rows = await sequelize.query<{
      delivery_day_id: string
      delivery_date: string
      meal_id: string
      meal_name_en: string
      meal_type: string
      kcal: number
      emoji: string
      photo_url: string | null
    }>(
      PENDING_RATING_DAYS_SQL,
      {
        replacements: { userId, subscriptionId, limit },
        type: QueryTypes.SELECT,
      }
    )

    return rows.map(r => ({
      deliveryDayId: r.delivery_day_id,
      deliveryDate: r.delivery_date,
      mealId: r.meal_id,
      mealName: r.meal_name_en,
      mealType: r.meal_type,
      kcal: r.kcal,
      emoji: r.emoji,
      photoUrl: resolveMealPhotoUrl(r.photo_url, r.meal_id),
    }))
  }

  async getPendingRatingCount(
    userId: string,
    subscriptionId: string
  ): Promise<number> {
    const sequelize = DeliveryDayModel.sequelize!
    const rows = await sequelize.query<{ count: string }>(
      PENDING_RATING_COUNT_SQL,
      {
        replacements: { userId, subscriptionId },
        type: QueryTypes.SELECT,
      }
    )
    return rows.length > 0 ? parseInt(rows[0].count, 10) : 0
  }

  async getRatingsByMeal(
    mealId: string,
    page: number,
    perPage: number
  ): Promise<MealRatingsByMeal> {
    const sequelize = MealRatingModel.sequelize!
    const offset = (page - 1) * perPage

    const summaryRows = await sequelize.query<{
      rating_count: string | number
      average_rating: string | number | null
    }>(RATINGS_BY_MEAL_SUMMARY_SQL, {
      replacements: { mealId },
      type: QueryTypes.SELECT,
    })

    const rows = await sequelize.query<{
      id: string
      user_id: string
      phone: string | null
      full_name: string | null
      stars: string | number
      tags: RatingTag[] | string | null
      delivery_date: string | Date
      created_at: string | Date
    }>(RATINGS_BY_MEAL_LIST_SQL, {
      replacements: { mealId, limit: perPage, offset },
      type: QueryTypes.SELECT,
    })

    const total =
      summaryRows.length > 0
        ? parseInt(String(summaryRows[0].rating_count), 10)
        : 0

    return {
      total,
      averageRating: toAverageRating(summaryRows[0]?.average_rating, total),
      ratings: rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        phone: row.phone,
        fullName: row.full_name,
        stars: Number(row.stars),
        tags: parseRatingTags(row.tags),
        deliveryDate: toDateOnly(row.delivery_date),
        createdAt:
          row.created_at instanceof Date
            ? row.created_at
            : new Date(row.created_at),
      })),
    }
  }

  async getRatingsByUser(
    userId: string,
    page: number,
    perPage: number
  ): Promise<{ ratings: MealRating[]; total: number }> {
    const offset = (page - 1) * perPage
    const { count, rows } = await MealRatingModel.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: perPage,
      offset,
    })
    return {
      ratings: rows.map(m => this.toEntity(m)),
      total: count,
    }
  }

  private toEntity(model: MealRatingModel): MealRating {
    return {
      id: model.id,
      userId: model.userId,
      subscriptionId: model.subscriptionId,
      deliveryDayId: model.deliveryDayId,
      mealId: model.mealId,
      deliveryDate: model.deliveryDate,
      stars: model.stars,
      tags: model.tags,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}

function toAverageRating(
  value: string | number | null | undefined,
  total: number
): number | null {
  if (total === 0 || value == null) return null
  const average = Number(value)
  if (!Number.isFinite(average)) return null
  return Math.round(average * 100) / 100
}

function parseRatingTags(value: RatingTag[] | string | null): RatingTag[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || value.length === 0) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as RatingTag[]) : []
  } catch {
    return []
  }
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return value.slice(0, 10)
}
