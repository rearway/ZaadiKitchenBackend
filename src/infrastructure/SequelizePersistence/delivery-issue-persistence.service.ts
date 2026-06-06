import { Injectable } from '@nestjs/common'
import { DeliveryIssuePersistor, DeliveryIssueLoader } from '../../core/entitygateway/DeliveryIssue.js'
import { DeliveryIssue } from '../../core/entities/DeliveryIssue.js'
import { DeliveryIssueModel } from './models/DeliveryIssueModel.js'

@Injectable()
export class DeliveryIssuePersistenceService
  implements DeliveryIssuePersistor, DeliveryIssueLoader
{
  async createIssue(
    input: Omit<DeliveryIssue, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<DeliveryIssue> {
    const model = await DeliveryIssueModel.create({ ...input })
    return this.toEntity(model)
  }

  async getIssuesBySubscription(subscriptionId: string): Promise<DeliveryIssue[]> {
    const models = await DeliveryIssueModel.findAll({
      where: { subscriptionId },
      order: [['createdAt', 'DESC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getIssueById(id: string): Promise<DeliveryIssue | null> {
    const model = await DeliveryIssueModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  private toEntity(model: DeliveryIssueModel): DeliveryIssue {
    return {
      id: model.id,
      userId: model.userId,
      subscriptionId: model.subscriptionId,
      deliveryDate: model.deliveryDate,
      issueType: model.issueType,
      description: model.description ?? undefined,
      status: model.status,
      creditedAmountSar: model.creditedAmountSar ?? undefined,
      rejectionReason: model.rejectionReason ?? undefined,
      rejectionNotes: model.rejectionNotes ?? undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
