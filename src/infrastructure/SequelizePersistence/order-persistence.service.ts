import { Injectable } from '@nestjs/common'
import { OrderLoader, OrderPersistor } from '../../core/entitygateway/Order.js'
import { Order } from '../../core/entities/Order.js'
import { OrderModel } from './models/index.js'

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
