import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import {
  PaymentTransactionLoader,
  PaymentTransactionPersistor,
} from '../../core/entitygateway/PaymentTransaction.js'
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../../core/entities/PaymentTransaction.js'
import { PaymentTransactionModel } from './models/PaymentTransactionModel.js'

@Injectable()
export class PaymentTransactionPersistenceService
  implements PaymentTransactionLoader, PaymentTransactionPersistor
{
  async getTransactionById(id: string): Promise<PaymentTransaction | null> {
    const model = await PaymentTransactionModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  async getTransactionsByStatus(
    status: PaymentTransactionStatus
  ): Promise<PaymentTransaction[]> {
    const models = await PaymentTransactionModel.findAll({
      where: { status },
      order: [['createdAt', 'ASC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getTransactionsByCheckoutSessionId(
    checkoutSessionId: string
  ): Promise<PaymentTransaction[]> {
    const models = await PaymentTransactionModel.findAll({
      where: { checkoutSessionId },
      order: [['createdAt', 'DESC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getTransactionByGatewayPaymentId(
    gatewayPaymentId: string
  ): Promise<PaymentTransaction | null> {
    const model = await PaymentTransactionModel.findOne({
      where: { gatewayPaymentId },
      order: [['createdAt', 'DESC']],
    })
    return model ? this.toEntity(model) : null
  }

  async createTransaction(input: {
    userId: string
    checkoutSessionId: string
    amountSar: number
    status: PaymentTransactionStatus
    startDate?: string | null
    paymentMethodId?: string | null
  }): Promise<PaymentTransaction> {
    const model = await PaymentTransactionModel.create({
      userId: input.userId,
      checkoutSessionId: input.checkoutSessionId,
      amountSar: input.amountSar,
      status: input.status,
      startDate: input.startDate ?? null,
      paymentMethodId: input.paymentMethodId ?? null,
    })
    return this.toEntity(model)
  }

  async updateTransaction(
    id: string,
    updates: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction> {
    const model = await PaymentTransactionModel.findByPk(id)
    if (!model) throw new Error(`PaymentTransaction not found: ${id}`)

    await model.update(updates)
    return this.toEntity(model)
  }

  async compareAndSetStatus(
    id: string,
    from: PaymentTransactionStatus[],
    to: PaymentTransactionStatus
  ): Promise<boolean> {
    const [count] = await PaymentTransactionModel.update(
      { status: to },
      { where: { id, status: { [Op.in]: from } } }
    )
    return count === 1
  }

  private toEntity(model: PaymentTransactionModel): PaymentTransaction {
    return {
      id: model.id,
      userId: model.userId,
      checkoutSessionId: model.checkoutSessionId,
      amountSar: model.amountSar,
      status: model.status,
      gatewayPaymentId: model.gatewayPaymentId,
      startDate: model.startDate ?? null,
      paymentMethodId: model.paymentMethodId ?? null,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
