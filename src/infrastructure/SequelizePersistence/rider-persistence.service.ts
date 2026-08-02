import { Injectable } from '@nestjs/common'
import type { RiderIssuePersistor } from '../../core/entitygateway/RiderIssue.js'
import type { RiderIssue } from '../../core/entities/RiderIssue.js'
import { RiderIssueModel } from './models/index.js'

@Injectable()
export class RiderPersistenceService implements RiderIssuePersistor {
  async createRiderIssue(
    input: Omit<RiderIssue, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RiderIssue> {
    const model = await RiderIssueModel.create({ ...input })
    return this.toRiderIssueEntity(model)
  }

  private toRiderIssueEntity(model: RiderIssueModel): RiderIssue {
    return {
      id: model.id,
      deliveryDayId: model.deliveryDayId,
      riderId: model.riderId,
      issueType: model.issueType,
      notes: model.notes,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
