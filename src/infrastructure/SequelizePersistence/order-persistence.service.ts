import { Injectable } from '@nestjs/common'
import {
  OrderLoader,
  OrderPersistor,
  type ConfirmedOrderBillingRow,
} from '../../core/entitygateway/Order.js'
import { Order } from '../../core/entities/Order.js'
import { OrderModel, PlanModel } from './models/index.js'

@Injectable()
export class OrderPersistenceService implements OrderLoader, OrderPersistor {
  async getOrderById(id: string): Promise<Order | null> {
    const model = await OrderModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  async getLastOrderByUserId(userId: string): Promise<Order | null> {
    const model = await OrderModel.findOne({
      where: { userId, status: 'confirmed' },
      order: [['createdAt', 'DESC']],
    })
    return model ? this.toEntity(model) : null
  }

  async hasUserUsedPromoCode(userId: string, code: string): Promise<boolean> {
    const count = await OrderModel.count({
      where: { userId, promoCode: code, status: 'confirmed' },
    })
    return count > 0
  }

  async getConfirmedOrdersForBilling(
    userId: string,
    pagination: { page: number; perPage: number }
  ): Promise<{ orders: ConfirmedOrderBillingRow[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.perPage
    const { rows, count } = await OrderModel.findAndCountAll({
      where: { userId, status: 'confirmed' },
      order: [['createdAt', 'DESC']],
      limit: pagination.perPage,
      offset,
    })

    const planIds = [...new Set(rows.map(r => r.planId))]
    const plans =
      planIds.length > 0
        ? await PlanModel.findAll({
            where: { id: planIds },
            attributes: ['id', 'name'],
          })
        : []
    const planNameById = new Map(plans.map(p => [p.id, p.name]))

    const orders: ConfirmedOrderBillingRow[] = rows.map(row => ({
      orderId: row.id,
      planName: planNameById.get(row.planId) ?? 'Plan',
      totalPaidSar: Number(row.totalPaidSar),
      planPriceSar: Number(row.planPriceSar),
      paymentMethodLabel: row.paymentMethodLabel,
      createdAt: row.createdAt,
    }))

    return { orders, total: count }
  }

  async createOrder(
    input: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Order> {
    const model = await OrderModel.create({ ...input })
    return this.toEntity(model)
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    await OrderModel.update(updates, { where: { id } })
    const model = await OrderModel.findByPk(id)
    return this.toEntity(model!)
  }

  private toEntity(model: OrderModel): Order {
    return {
      id: model.id,
      userId: model.userId,
      subscriptionId: model.subscriptionId,
      planId: model.planId,
      paymentMethodId: model.paymentMethodId,
      mealType: model.mealType,
      mealCount: model.mealCount,
      startDate: model.startDate,
      planPriceSar: Number(model.planPriceSar),
      walletCreditSar: Number(model.walletCreditSar),
      promoDiscountSar: Number(model.promoDiscountSar),
      promoCode: model.promoCode,
      discountLabel: model.discountLabel,
      totalPaidSar: Number(model.totalPaidSar),
      paymentMethodType: model.paymentMethodType,
      paymentMethodLabel: model.paymentMethodLabel,
      gatewayPaymentId: model.gatewayPaymentId,
      status: model.status,
      isNewUser: model.isNewUser,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
