import { Injectable } from '@nestjs/common'
import {
  PaymentTransactionLoader,
  PaymentTransactionPersistor,
} from '../../core/entitygateway/PaymentTransaction.js'
import { PaymentTransaction, PaymentTransactionStatus } from '../../core/entities/PaymentTransaction.js'
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
    return models.map((m) => this.toEntity(m))
  }

  async createTransaction(input: {
    userId: string
    checkoutSessionId: string
    amountSar: number
    status: PaymentTransactionStatus
  }): Promise<PaymentTransaction> {
    const model = await PaymentTransactionModel.create({
      userId: input.userId,
      checkoutSessionId: input.checkoutSessionId,
      amountSar: input.amountSar,
      status: input.status,
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

  private toEntity(model: PaymentTransactionModel): PaymentTransaction {
    return {
      id: model.id,
      userId: model.userId,
      checkoutSessionId: model.checkoutSessionId,
      amountSar: model.amountSar,
      status: model.status,
      gatewayPaymentId: model.gatewayPaymentId,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
