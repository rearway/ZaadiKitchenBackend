import { Injectable } from '@nestjs/common'
import { QueryTypes } from 'sequelize'
import {
  DeliveryIssuePersistor,
  DeliveryIssueLoader,
  DailyOpsIssueRow,
} from '../../core/entitygateway/DeliveryIssue.js'
import { DeliveryIssue, IssueStatus } from '../../core/entities/DeliveryIssue.js'
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

  async getOpenIssuesByDate(
    date?: string,
    status: IssueStatus | 'all' = 'open'
  ): Promise<DailyOpsIssueRow[]> {
    const sequelize = DeliveryIssueModel.sequelize!
    const conditions: string[] = []
    const replacements: Record<string, unknown> = {}

    if (date) {
      conditions.push('di.delivery_date = :date')
      replacements.date = date
    }
    if (status !== 'all') {
      conditions.push('di.status = :status')
      replacements.status = status
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await sequelize.query<{
      issue_id: string
      customer_id: string
      customer_name: string
      customer_phone: string | null
      building_name: string | null
      floor: string | null
      issue_type: string
      description: string | null
      submitted_at: Date
      delivery_date: string
      meal_name: string | null
      meal_type: string | null
      plan_price_per_meal_sar: string | null
      status: IssueStatus
      credited_amount_sar: string | null
      rejection_reason: string | null
      rejection_notes: string | null
      resolved_at: Date
    }>(
      `SELECT * FROM (
         SELECT DISTINCT ON (di.id)
                di.id as issue_id,
                di.user_id as customer_id,
                u.full_name as customer_name,
                u.phone as customer_phone,
                dl.building_name,
                dl.floor,
                di.issue_type,
                di.description,
                di.created_at as submitted_at,
                di.delivery_date,
                dd.meal_name,
                dd.meal_type,
                p.price_per_meal_sar as plan_price_per_meal_sar,
                di.status,
                di.credited_amount_sar,
                di.rejection_reason,
                di.rejection_notes,
                di.updated_at as resolved_at
         FROM delivery_issues di
         JOIN users u ON u.id = di.user_id
         JOIN subscriptions s ON s.id = di.subscription_id
         JOIN plans p ON p.id = s.plan_id
         LEFT JOIN delivery_days dd ON dd.subscription_id = di.subscription_id AND dd.date = di.delivery_date
         LEFT JOIN delivery_locations dl ON dl.user_id = di.user_id AND dl.is_primary = true
         ${where}
         ORDER BY di.id, dd.meal_type
       ) sub
       ORDER BY submitted_at DESC`,
      { replacements, type: QueryTypes.SELECT }
    )

    return rows.map(r => ({
      issueId: r.issue_id,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      deliveryAddress: r.building_name ? [r.building_name, r.floor].filter(Boolean).join(' · ') : null,
      issueType: r.issue_type,
      description: r.description,
      submittedAt: r.submitted_at,
      deliveryDate: r.delivery_date,
      mealName: r.meal_name,
      mealType: r.meal_type,
      planPricePerMealSar: r.plan_price_per_meal_sar ? Number(r.plan_price_per_meal_sar) : null,
      status: r.status,
      creditedAmountSar: r.credited_amount_sar ? Number(r.credited_amount_sar) : null,
      rejectionReason: r.rejection_reason,
      rejectionNotes: r.rejection_notes,
      resolvedAt: r.status === 'open' ? null : r.resolved_at,
    }))
  }

  async resolveIssue(
    id: string,
    resolution: 'credited' | 'rejected',
    details: {
      creditedAmountSar?: number
      rejectionReason?: string
      rejectionNotes?: string
    }
  ): Promise<DeliveryIssue> {
    await DeliveryIssueModel.update(
      {
        status: resolution,
        creditedAmountSar: details.creditedAmountSar ?? null,
        rejectionReason: details.rejectionReason ?? null,
        rejectionNotes: details.rejectionNotes ?? null,
      },
      { where: { id } }
    )
    const model = await DeliveryIssueModel.findByPk(id)
    return this.toEntity(model!)
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
