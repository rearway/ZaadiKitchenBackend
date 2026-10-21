import { Injectable } from '@nestjs/common'
import { Op, QueryTypes } from 'sequelize'
import {
  SubscriptionLoader,
  SubscriptionPersistor,
} from '../../core/entitygateway/Subscription.js'
import {
  DeliveryDayLoader,
  DeliveryDayPersistor,
  DeliveryHistoryEntry,
  RiderDeliveryRow,
  MealBreakdownRow,
} from '../../core/entitygateway/DeliveryDay.js'
import { effectiveMealLateralJoin } from './sql/effectiveMealJoin.js'
import { Subscription } from '../../core/entities/Subscription.js'
import {
  DeliveryDay,
  DeliveryDayStatus,
} from '../../core/entities/DeliveryDay.js'
import { SubscriptionModel, DeliveryDayModel } from './models/index.js'
import { resolveMealPhotoUrl } from '../../core/usecases/services/mealPhotoUtils.js'

@Injectable()
export class SubscriptionPersistenceService
  implements
    SubscriptionLoader,
    SubscriptionPersistor,
    DeliveryDayLoader,
    DeliveryDayPersistor
{
  async getActiveSubscriptionByUserId(
    userId: string
  ): Promise<Subscription | null> {
    const model = await SubscriptionModel.findOne({
      where: { userId, status: ['active', 'paused', 'cancelled'] },
      order: [['createdAt', 'DESC']],
    })
    return model ? this.toSubscriptionEntity(model) : null
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    const model = await SubscriptionModel.findByPk(id)
    return model ? this.toSubscriptionEntity(model) : null
  }

  async createSubscription(
    input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Subscription> {
    const model = await SubscriptionModel.create({ ...input })
    return this.toSubscriptionEntity(model)
  }

  async updateSubscription(
    id: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    await SubscriptionModel.update(updates, { where: { id } })
    const model = await SubscriptionModel.findByPk(id)
    return this.toSubscriptionEntity(model!)
  }

  async expireActiveSubscriptions(beforeDate: string): Promise<number> {
    const [count] = await SubscriptionModel.update(
      { status: 'expired' },
      {
        where: {
          status: ['active', 'paused', 'cancelled'],
          endDate: { [Op.lt]: beforeDate },
        },
      }
    )
    return count
  }

  async getDeliveryDaysBySubscription(
    subscriptionId: string,
    filters?: { from?: string; to?: string }
  ): Promise<DeliveryDay[]> {
    const where: Record<string, unknown> = { subscriptionId }
    if (filters?.from || filters?.to) {
      const dateFilter: Record<string, unknown> = {}
      if (filters.from) dateFilter[Op.gte as unknown as string] = filters.from
      if (filters.to) dateFilter[Op.lte as unknown as string] = filters.to
      where['date'] = dateFilter
    }
    const models = await DeliveryDayModel.findAll({
      where,
      order: [['date', 'ASC']],
    })
    return models.map(m => this.toDeliveryDayEntity(m))
  }

  async getDeliveryHistory(
    userId: string,
    page: number,
    perPage: number,
    period?: string
  ): Promise<{ days: DeliveryHistoryEntry[]; total: number }> {
    const sequelize = DeliveryDayModel.sequelize!
    const offset = (page - 1) * perPage

    let dateFilter = ''
    if (period === 'last_30_days') {
      dateFilter = `AND dd.date >= CURRENT_DATE - INTERVAL '30 days'`
    } else if (period === 'last_90_days') {
      dateFilter = `AND dd.date >= CURRENT_DATE - INTERVAL '90 days'`
    }

    const [{ count }] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM delivery_days dd
       WHERE dd.user_id = :userId
         AND dd.status IN ('delivered', 'skipped') ${dateFilter}`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    )
    const total = parseInt(count, 10)

    const rows = await sequelize.query<{
      delivery_day_id: string
      date: string
      meal_type: string
      meal_name: string | null
      meal_id: string | null
      photo_url: string | null
      kcal: number | null
      status: string
      stars: number | null
      tags: string | null
    }>(
      `SELECT dd.id as delivery_day_id,
              dd.date,
              dd.meal_type,
              COALESCE(em.name_en, dd.meal_name) as meal_name,
              em.meal_id as meal_id,
              em.photo_url,
              em.kcal,
              dd.status,
              mr.stars,
              mr.tags
       FROM delivery_days dd
       ${effectiveMealLateralJoin()}
       LEFT JOIN meal_ratings mr ON mr.delivery_day_id = dd.id AND mr.user_id = :userId
       WHERE dd.user_id = :userId
         AND dd.status IN ('delivered', 'skipped') ${dateFilter}
       ORDER BY dd.date DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: { userId, limit: perPage, offset },
        type: QueryTypes.SELECT,
      }
    )

    const days: DeliveryHistoryEntry[] = rows.map(r => ({
      deliveryDayId: r.delivery_day_id,
      date: r.date,
      mealType: r.meal_type,
      mealName: r.meal_name,
      photoUrl: resolveMealPhotoUrl(r.photo_url, r.meal_id),
      kcal: r.kcal,
      status: r.status,
      stars: r.stars,
      tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
    }))

    return { days, total }
  }

  async getDeliveryDayById(id: string): Promise<DeliveryDay | null> {
    const model = await DeliveryDayModel.findByPk(id)
    return model ? this.toDeliveryDayEntity(model) : null
  }

  async getDeliveryDayByDate(
    subscriptionId: string,
    date: string
  ): Promise<DeliveryDay | null> {
    const model = await DeliveryDayModel.findOne({
      where: { subscriptionId, date },
    })
    return model ? this.toDeliveryDayEntity(model) : null
  }

  async bulkCreateDeliveryDays(
    days: Omit<DeliveryDay, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<DeliveryDay[]> {
    const models = await DeliveryDayModel.bulkCreate(days)
    return models.map(m => this.toDeliveryDayEntity(m))
  }

  async updateDeliveryDayStatus(
    id: string,
    status: DeliveryDayStatus
  ): Promise<DeliveryDay> {
    await DeliveryDayModel.update({ status }, { where: { id } })
    const model = await DeliveryDayModel.findByPk(id)
    return this.toDeliveryDayEntity(model!)
  }

  async markDeliveryDelivered(id: string): Promise<DeliveryDay> {
    const deliveredAt = new Date()
    await DeliveryDayModel.update(
      { status: 'delivered', deliveredAt },
      { where: { id } }
    )
    const model = await DeliveryDayModel.findByPk(id)
    return this.toDeliveryDayEntity(model!)
  }

  async getRiderDeliveriesByDate(
    date: string,
    areaId?: string
  ): Promise<RiderDeliveryRow[]> {
    const sequelize = DeliveryDayModel.sequelize!

    const rows = await sequelize.query<{
      delivery_day_id: string
      customer_name: string
      customer_phone: string | null
      building_name: string | null
      floor: string | null
      desk_area: string | null
      gate: string | null
      delivery_preference: 'hand_to_me' | 'reception' | null
      rider_notes: string | null
      area_id: string | null
      area_name: string | null
      meal_type: 'executive' | 'salad'
      meal_name: string | null
      status: DeliveryDayStatus
      delivered_at: Date | null
    }>(
      `SELECT * FROM (
         SELECT DISTINCT ON (dd.user_id)
                dd.id as delivery_day_id,
                u.full_name as customer_name,
                u.phone as customer_phone,
                dl.building_name,
                dl.floor,
                dl.desk_area,
                dl.gate,
                dl.delivery_preference,
                dl.rider_notes,
                da.id as area_id,
                da.name as area_name,
                dd.meal_type,
                COALESCE(em.name_en, dd.meal_name) as meal_name,
                dd.status,
                dd.delivered_at
         FROM delivery_days dd
         JOIN users u ON u.id = dd.user_id
         JOIN subscriptions s ON s.id = dd.subscription_id
         ${effectiveMealLateralJoin()}
         LEFT JOIN LATERAL (
           SELECT * FROM delivery_locations l
           WHERE l.user_id = dd.user_id AND l.is_primary = true
           ORDER BY l.updated_at DESC
           LIMIT 1
         ) dl ON true
         LEFT JOIN delivery_areas da ON da.id = dl.area_id
         WHERE dd.date = :date
           AND dd.status IN ('scheduled', 'past_cutoff', 'delivered')
           AND s.status IN ('active', 'paused', 'cancelled')
           ${areaId ? 'AND da.id = :areaId' : ''}
         ORDER BY dd.user_id,
                  CASE dd.status WHEN 'delivered' THEN 0 WHEN 'past_cutoff' THEN 1 ELSE 2 END,
                  s.created_at ASC
       ) one_per_user
       ORDER BY area_name ASC NULLS LAST, building_name ASC NULLS LAST, customer_name ASC`,
      {
        replacements: areaId ? { date, areaId } : { date },
        type: QueryTypes.SELECT,
      }
    )

    return rows.map(r => ({
      deliveryDayId: r.delivery_day_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      buildingName: r.building_name,
      floor: r.floor,
      deskArea: r.desk_area,
      gate: r.gate,
      deliveryPreference: r.delivery_preference,
      riderNotes: r.rider_notes,
      areaId: r.area_id,
      areaName: r.area_name,
      mealType: r.meal_type,
      mealName: r.meal_name,
      status: r.status,
      deliveredAt: r.delivered_at,
    }))
  }

  async getMealBreakdownByDate(date: string): Promise<MealBreakdownRow[]> {
    const rows = await DeliveryDayModel.sequelize!.query<{
      meal_type: 'executive' | 'salad'
      meal_id: string | null
      meal_name: string | null
    }>(
      `SELECT DISTINCT ON (dd.user_id)
              dd.meal_type,
              em.meal_id,
              em.name_en as meal_name
       FROM delivery_days dd
       JOIN subscriptions s ON s.id = dd.subscription_id
       ${effectiveMealLateralJoin()}
       WHERE dd.date = :date
         AND dd.status IN ('scheduled', 'past_cutoff', 'delivered')
         AND s.status IN ('active', 'paused', 'cancelled')
       ORDER BY dd.user_id,
                CASE dd.status WHEN 'delivered' THEN 0 WHEN 'past_cutoff' THEN 1 ELSE 2 END,
                s.created_at ASC`,
      { replacements: { date }, type: QueryTypes.SELECT }
    )

    const counts = new Map<string, MealBreakdownRow>()
    for (const r of rows) {
      const key = r.meal_id ?? r.meal_type
      const existing = counts.get(key)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(key, {
          mealType: r.meal_type,
          mealId: r.meal_id,
          mealName: r.meal_name,
          count: 1,
        })
      }
    }

    return [...counts.values()].sort((a, b) => b.count - a.count)
  }

  async bulkUpdateDeliveryDayStatus(
    subscriptionId: string,
    fromDate: string,
    toDate: string,
    fromStatus: DeliveryDayStatus,
    toStatus: DeliveryDayStatus
  ): Promise<number> {
    const [count] = await DeliveryDayModel.update(
      { status: toStatus },
      {
        where: {
          subscriptionId,
          status: fromStatus,
          date: { [Op.between]: [fromDate, toDate] },
        },
      }
    )
    return count
  }

  async deleteScheduledDeliveryDaysOutsideDates(
    subscriptionId: string,
    allowedDates: string[]
  ): Promise<void> {
    await DeliveryDayModel.destroy({
      where: {
        subscriptionId,
        status: 'scheduled',
        date: { [Op.notIn]: allowedDates },
      },
    })
  }

  async updateMealTypeForSubscription(
    subscriptionId: string,
    mealType: 'executive' | 'salad',
    fromDate: string,
    specificDates?: string[]
  ): Promise<void> {
    const where: Record<string, unknown> = {
      subscriptionId,
      status: 'scheduled',
    }
    if (specificDates?.length) {
      where['date'] = { [Op.in]: specificDates }
    } else {
      where['date'] = { [Op.gte]: fromDate }
    }
    await DeliveryDayModel.update(
      { mealType, selectedMealId: null },
      { where }
    )
  }

  async updateSelectedMeal(
    id: string,
    selectedMealId: string | null,
    mealName: string | null
  ): Promise<DeliveryDay> {
    await DeliveryDayModel.update(
      { selectedMealId, mealName },
      { where: { id } }
    )
    const model = await DeliveryDayModel.findByPk(id)
    return this.toDeliveryDayEntity(model!)
  }

  private toSubscriptionEntity(model: SubscriptionModel): Subscription {
    return {
      id: model.id,
      userId: model.userId,
      orderId: model.orderId,
      planId: model.planId,
      mealType: model.mealType,
      status: model.status,
      totalMealDays: model.totalMealDays,
      deliveredCount: model.deliveredCount,
      skippedCount: model.skippedCount,
      startDate: model.startDate,
      endDate: model.endDate,
      skipDaysAllowed: model.skipDaysAllowed,
      skipDaysUsed: model.skipDaysUsed,
      pauseDaysAllowed: model.pauseDaysAllowed,
      pauseDaysUsed: model.pauseDaysUsed,
      pausedFrom: model.pausedFrom,
      pausedUntil: model.pausedUntil,
      pauseCeilingDate: model.pauseCeilingDate,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  private toDeliveryDayEntity(model: DeliveryDayModel): DeliveryDay {
    return {
      id: model.id,
      subscriptionId: model.subscriptionId,
      userId: model.userId,
      date: model.date,
      mealType: model.mealType,
      mealName: model.mealName,
      selectedMealId: model.selectedMealId,
      status: model.status,
      deliveredAt: model.deliveredAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
