import { Injectable } from '@nestjs/common'
import { AuditLogLoader, AuditLogPersistor, CreateAuditLogInput } from '../../core/entitygateway/AuditLog.js'
import { AuditLog } from '../../core/entities/AuditLog.js'
import { AuditLogModel } from './models/index.js'

@Injectable()
export class AuditLogPersistenceService implements AuditLogLoader, AuditLogPersistor {
  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const model = await AuditLogModel.create({
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      action: input.action,
      metadata: input.metadata ?? null,
    })
    return this.toEntity(model)
  }

  async getAuditLogsBySubscription(subscriptionId: string): Promise<AuditLog[]> {
    const models = await AuditLogModel.findAll({
      where: { subscriptionId },
      order: [['createdAt', 'DESC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    const models = await AuditLogModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    })
    return models.map(m => this.toEntity(m))
  }

  private toEntity(model: AuditLogModel): AuditLog {
    return {
      id: model.id,
      userId: model.userId,
      subscriptionId: model.subscriptionId,
      action: model.action,
      metadata: model.metadata,
      createdAt: model.createdAt,
    }
  }
}
