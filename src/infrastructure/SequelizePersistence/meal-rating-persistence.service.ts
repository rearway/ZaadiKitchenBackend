import { Injectable } from '@nestjs/common'
import { Op, QueryTypes } from 'sequelize'
import { MealRatingPersistor, MealRatingLoader, PendingRatingDay } from '../../core/entitygateway/MealRating.js'
import { MealRating } from '../../core/entities/MealRating.js'
import { MealRatingModel } from './models/MealRatingModel.js'
import { DeliveryDayModel } from './models/DeliveryDayModel.js'
import { MealModel } from './models/MealModel.js'

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
    }>(
      `SELECT dd.id as delivery_day_id,
              dd.date as delivery_date,
              m.id as meal_id,
              m.name_en as meal_name_en,
              m.meal_type,
              m.kcal,
              m.emoji
       FROM delivery_days dd
       INNER JOIN meals m ON m.id = (
         SELECT ms.meal_id FROM menu_slots ms
         INNER JOIN menu_weeks mw ON mw.id = ms.week_id
         WHERE ms.meal_type = dd.meal_type
           AND mw.date_from <= dd.date AND mw.date_to >= dd.date
         LIMIT 1
       )
       LEFT JOIN meal_ratings mr ON mr.delivery_day_id = dd.id AND mr.user_id = :userId
       WHERE dd.subscription_id = :subscriptionId
         AND dd.status = 'delivered'
         AND mr.id IS NULL
       ORDER BY dd.date DESC
       LIMIT :limit`,
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
    }))
  }

  async getPendingRatingCount(
    userId: string,
    subscriptionId: string
  ): Promise<number> {
    const sequelize = DeliveryDayModel.sequelize!
    const rows = await sequelize.query<{ count: string }>(
      `SELECT COUNT(dd.id) as count
       FROM delivery_days dd
       LEFT JOIN meal_ratings mr ON mr.delivery_day_id = dd.id AND mr.user_id = :userId
       WHERE dd.subscription_id = :subscriptionId
         AND dd.status = 'delivered'
         AND mr.id IS NULL`,
      {
        replacements: { userId, subscriptionId },
        type: QueryTypes.SELECT,
      }
    )
    return rows.length > 0 ? parseInt(rows[0].count, 10) : 0
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
