import { Injectable } from '@nestjs/common'
import { QueryTypes } from 'sequelize'
import type {
  CommsLoader,
  CommsPersistor,
  CommsAutomationState,
  CommsBroadcastRecord,
} from '../../core/entitygateway/Comms.js'
import {
  AUTOMATION_DEFINITIONS,
  AUTOMATION_IDS,
  BROADCAST_SEGMENT_IDS,
  type AutomationId,
  type BroadcastSegmentId,
} from '../../core/usecases/services/commsUtils.js'
import { CommsAutomationModel, CommsBroadcastModel, UserDeviceModel } from './models/index.js'

interface CountRow {
  count: string
}

interface UserIdRow {
  user_id: string
}

interface EndpointRow {
  endpoint_arn: string
}

@Injectable()
export class CommsPersistenceService implements CommsLoader, CommsPersistor {
  async getAutomationStates(): Promise<CommsAutomationState[]> {
    await this.ensureAutomationSeeds()
    const models = await CommsAutomationModel.findAll({
      where: { id: AUTOMATION_IDS },
    })
    const byId = new Map(models.map(m => [m.id, m]))

    return AUTOMATION_DEFINITIONS.map(def => {
      const model = byId.get(def.id)
      return {
        id: def.id,
        isEnabled: model?.isEnabled ?? def.defaultEnabled,
        updatedAt: model?.updatedAt ?? null,
        updatedByUserId: model?.updatedByUserId ?? null,
      }
    })
  }

  async isAutomationEnabled(id: AutomationId): Promise<boolean> {
    const states = await this.getAutomationStates()
    return states.find(s => s.id === id)?.isEnabled ?? false
  }

  async setAutomationEnabled(
    id: AutomationId,
    isEnabled: boolean,
    updatedByUserId: string
  ): Promise<CommsAutomationState> {
    await this.ensureAutomationSeeds()
    const [model] = await CommsAutomationModel.upsert({
      id,
      isEnabled,
      updatedByUserId,
    })

    return {
      id: id as AutomationId,
      isEnabled: model.isEnabled,
      updatedAt: model.updatedAt,
      updatedByUserId: model.updatedByUserId,
    }
  }

  async getBroadcastSegmentCounts(
    todayKsa: string
  ): Promise<Record<BroadcastSegmentId, number>> {
    const counts = {} as Record<BroadcastSegmentId, number>
    for (const segmentId of BROADCAST_SEGMENT_IDS) {
      counts[segmentId] = await this.countSegmentRecipients(segmentId, todayKsa)
    }
    return counts
  }

  async getSegmentRecipientUserIds(
    segmentId: BroadcastSegmentId,
    todayKsa: string
  ): Promise<string[]> {
    const sequelize = CommsAutomationModel.sequelize!
    const { sql, replacements } = this.segmentUsersQuery(segmentId, todayKsa)
    const rows = await sequelize.query<UserIdRow>(sql, {
      replacements,
      type: QueryTypes.SELECT,
    })
    return rows.map(r => r.user_id)
  }

  async getActiveDeviceEndpointsForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return []

    const sequelize = UserDeviceModel.sequelize!
    const rows = await sequelize.query<EndpointRow>(
      `SELECT DISTINCT endpoint_arn AS "endpoint_arn"
       FROM user_devices
       WHERE user_id IN (:userIds)
         AND is_active = true`,
      { replacements: { userIds }, type: QueryTypes.SELECT }
    )
    return rows.map(r => r.endpoint_arn)
  }

  async createBroadcastRecord(input: {
    segmentId: BroadcastSegmentId
    message: string
    recipientCount: number
    sentByUserId: string
  }): Promise<CommsBroadcastRecord> {
    const sentAt = new Date()
    const model = await CommsBroadcastModel.create({
      segmentId: input.segmentId,
      message: input.message,
      recipientCount: input.recipientCount,
      sentByUserId: input.sentByUserId,
      status: 'sent',
      sentAt,
    })

    return {
      id: model.id,
      segmentId: input.segmentId,
      message: model.message,
      recipientCount: model.recipientCount,
      sentByUserId: model.sentByUserId,
      status: 'sent',
      sentAt: model.sentAt,
    }
  }

  private async countSegmentRecipients(
    segmentId: BroadcastSegmentId,
    todayKsa: string
  ): Promise<number> {
    const sequelize = CommsAutomationModel.sequelize!
    const { sql, replacements } = this.segmentUsersQuery(segmentId, todayKsa)
    const [row] = await sequelize.query<CountRow>(
      `SELECT COUNT(*) AS count FROM (${sql}) segment_users`,
      { replacements, type: QueryTypes.SELECT }
    )
    return parseInt(row?.count ?? '0', 10)
  }

  private segmentUsersQuery(
    segmentId: BroadcastSegmentId,
    todayKsa: string
  ): { sql: string; replacements: Record<string, unknown> } {
    const replacements: Record<string, unknown> = { todayKsa }

    switch (segmentId) {
      case 'all_subscribers':
        return {
          sql: `SELECT DISTINCT s.user_id
                FROM subscriptions s
                JOIN users u ON u.id = s.user_id
                WHERE u.role = 'CUSTOMER'
                  AND (
                    s.status IN ('active', 'paused')
                    OR (s.status = 'cancelled' AND s.end_date >= :todayKsa::date)
                  )`,
          replacements,
        }
      case 'active':
        return {
          sql: `SELECT DISTINCT s.user_id
                FROM subscriptions s
                JOIN users u ON u.id = s.user_id
                WHERE u.role = 'CUSTOMER'
                  AND s.status = 'active'
                  AND s.end_date >= :todayKsa::date`,
          replacements,
        }
      case 'paused':
        return {
          sql: `SELECT DISTINCT s.user_id
                FROM subscriptions s
                JOIN users u ON u.id = s.user_id
                WHERE u.role = 'CUSTOMER'
                  AND s.status = 'paused'`,
          replacements,
        }
      case 'delivering_today':
        return {
          sql: `SELECT DISTINCT dd.user_id
                FROM delivery_days dd
                JOIN subscriptions s ON s.id = dd.subscription_id
                JOIN users u ON u.id = dd.user_id
                WHERE u.role = 'CUSTOMER'
                  AND dd.date = :todayKsa::date
                  AND dd.status IN ('scheduled', 'past_cutoff')
                  AND s.status = 'active'`,
          replacements,
        }
    }
  }

  private async ensureAutomationSeeds(): Promise<void> {
    const existing = await CommsAutomationModel.count()
    if (existing > 0) return

    await CommsAutomationModel.bulkCreate(
      AUTOMATION_DEFINITIONS.map(def => ({
        id: def.id,
        isEnabled: def.defaultEnabled,
      }))
    )
  }
}
