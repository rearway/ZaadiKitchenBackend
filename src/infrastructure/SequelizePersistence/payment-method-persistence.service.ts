import { Injectable } from '@nestjs/common'
import {
  PaymentMethodLoader,
  PaymentMethodPersistor,
} from '../../core/entitygateway/PaymentMethod.js'
import { PaymentMethod } from '../../core/entities/PaymentMethod.js'
import { PaymentMethodModel } from './models/index.js'

@Injectable()
export class PaymentMethodPersistenceService
  implements PaymentMethodLoader, PaymentMethodPersistor
{
  async getMethodsByUserId(userId: string): Promise<PaymentMethod[]> {
    const models = await PaymentMethodModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getMethodById(id: string): Promise<PaymentMethod | null> {
    const model = await PaymentMethodModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  async createMethod(
    input: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentMethod> {
    const model = await PaymentMethodModel.create({ ...input })
    return this.toEntity(model)
  }

  async deleteMethod(id: string): Promise<void> {
    await PaymentMethodModel.destroy({ where: { id } })
  }

  async markAsLastUsed(id: string, userId: string): Promise<void> {
    await PaymentMethodModel.update(
      { isLastUsed: false },
      { where: { userId } }
    )
    await PaymentMethodModel.update({ isLastUsed: true }, { where: { id } })
  }

  private toEntity(model: PaymentMethodModel): PaymentMethod {
    return {
      id: model.id,
      userId: model.userId,
      type: model.type,
      label: model.label,
      token: model.token,
      isDefault: model.isDefault,
      isLastUsed: model.isLastUsed,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
