import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import {
  SubscriptionLoader,
  SubscriptionPersistor,
} from '../../core/entitygateway/Subscription.js'
import {
  DeliveryDayLoader,
  DeliveryDayPersistor,
} from '../../core/entitygateway/DeliveryDay.js'
import { Subscription } from '../../core/entities/Subscription.js'
import {
  DeliveryDay,
  DeliveryDayStatus,
} from '../../core/entities/DeliveryDay.js'
import { SubscriptionModel, DeliveryDayModel } from './models/index.js'

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
          status: ['active', 'paused'],
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
    await DeliveryDayModel.update({ mealType }, { where })
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
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
