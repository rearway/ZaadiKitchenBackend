import { Injectable } from '@nestjs/common'
import { QueryTypes, fn, col, literal, Op } from 'sequelize'
import type {
  AdminCustomerLoader,
  AdminCustomerPersistor,
  CustomerListItem,
  AdminCustomerDetail,
  CustomerActiveSubscription,
  CustomerAddress,
  CustomerHistorySubscription,
  CustomerHistoryDelivery,
  CustomerHistoryIssue,
} from '../../core/entitygateway/AdminCustomer.js'
import {
  UserModel,
  SubscriptionModel,
  PlanModel,
  WalletTransactionModel,
  DeliveryLocationModel,
  DeliveryAreaModel,
  DeliveryIssueModel,
  DeliveryDayModel,
} from './models/index.js'

interface CustomerListRow {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  isActive: boolean
  createdAt: string
  subscriptionStatus: string | null
  endDate: string | null
  planName: string | null
}

interface CountRow {
  count: string
}

@Injectable()
export class AdminCustomerPersistenceService
  implements AdminCustomerLoader, AdminCustomerPersistor
{
  async listCustomers(params: {
    q?: string
    status?: string
    page: number
    perPage: number
  }): Promise<{ customers: CustomerListItem[]; total: number }> {
    const sequelize = UserModel.sequelize!
    const offset = (params.page - 1) * params.perPage

    const conditions: string[] = ["u.role = 'CUSTOMER'"]
    const replacements: Record<string, unknown> = {
      limit: params.perPage,
      offset,
    }

    if (params.q) {
      conditions.push('(u.full_name ILIKE :q OR u.phone ILIKE :q OR u.email ILIKE :q)')
      replacements.q = `%${params.q}%`
    }

    if (params.status) {
      conditions.push('s.status = :status')
      replacements.status = params.status
    }

    const whereClause = conditions.join(' AND ')

    const baseFrom = `
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
        AND s.id = (
          SELECT id FROM subscriptions sub
          WHERE sub.user_id = u.id
          ORDER BY sub.created_at DESC LIMIT 1
        )
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE ${whereClause}
    `

    const rows = await sequelize.query<CustomerListRow>(
      `SELECT
        u.id,
        u.full_name    AS "fullName",
        u.phone,
        u.email,
        u.is_active    AS "isActive",
        u.created_at   AS "createdAt",
        s.status       AS "subscriptionStatus",
        s.end_date     AS "endDate",
        p.name         AS "planName"
      ${baseFrom}
      ORDER BY u.created_at DESC
      LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    )

    const [countResult] = await sequelize.query<CountRow>(
      `SELECT COUNT(*) AS count ${baseFrom}`,
      { replacements, type: QueryTypes.SELECT }
    )

    const customers: CustomerListItem[] = rows.map(row => ({
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      isActive: row.isActive,
      createdAt: new Date(row.createdAt),
      subscriptionStatus: (row.subscriptionStatus as CustomerListItem['subscriptionStatus']) ?? null,
      endDate: row.endDate ?? null,
      planName: row.planName ?? null,
    }))

    return { customers, total: parseInt(countResult?.count ?? '0', 10) }
  }

  async getCustomerDetail(userId: string): Promise<AdminCustomerDetail | null> {
    const user = await UserModel.findOne({
      where: { id: userId, role: 'CUSTOMER' },
    })
    if (!user) return null

    const subscription = await SubscriptionModel.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    })

    let subscriptionData: CustomerActiveSubscription | null = null
    if (subscription) {
      const plan = await PlanModel.findByPk(subscription.planId)
      const today = new Date().toISOString().split('T')[0]
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (new Date(subscription.endDate).getTime() - new Date(today).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
      subscriptionData = {
        id: subscription.id,
        planName: plan?.name ?? '',
        mealType: subscription.mealType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining,
        deliveredCount: subscription.deliveredCount,
        skippedCount: subscription.skippedCount,
        skipDaysUsed: subscription.skipDaysUsed,
        skipDaysAllowed: subscription.skipDaysAllowed,
        pauseDaysUsed: subscription.pauseDaysUsed,
        pauseDaysAllowed: subscription.pauseDaysAllowed,
      }
    }

    const balanceResult = await WalletTransactionModel.findOne({
      where: { userId },
      attributes: [
        [fn('COALESCE', fn('SUM', col('amount_sar')), literal('0')), 'balance'],
      ],
      raw: true,
    })
    const walletBalanceSar = Number((balanceResult as unknown as { balance: string })?.balance ?? 0)

    const location = await DeliveryLocationModel.findOne({
      where: { userId, isPrimary: true },
    })
    let primaryAddress: CustomerAddress | null = null
    if (location) {
      const area = await DeliveryAreaModel.findByPk(location.areaId)
      primaryAddress = {
        buildingName: location.buildingName,
        floor: location.floor,
        areaName: area?.name ?? '',
      }
    }

    const openIssueCount = await DeliveryIssueModel.count({
      where: { userId, status: 'open' },
    })

    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      subscription: subscriptionData,
      walletBalanceSar,
      primaryAddress,
      openIssueCount,
    }
  }

  async getCustomerHistory(userId: string): Promise<{
    subscriptions: CustomerHistorySubscription[]
    deliveries: CustomerHistoryDelivery[]
    issues: CustomerHistoryIssue[]
  }> {
    const subscriptionModels = await SubscriptionModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    })

    const planIds = [...new Set(subscriptionModels.map(s => s.planId))]
    const planModels = planIds.length
      ? await PlanModel.findAll({ where: { id: { [Op.in]: planIds } } })
      : []
    const planMap = new Map(planModels.map(p => [p.id, p.name]))

    const subscriptions: CustomerHistorySubscription[] = subscriptionModels.map(s => ({
      id: s.id,
      planName: planMap.get(s.planId) ?? '',
      mealType: s.mealType,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      deliveredCount: s.deliveredCount,
      skippedCount: s.skippedCount,
    }))

    const deliveryDayModels = await DeliveryDayModel.findAll({
      where: { userId },
      order: [['date', 'DESC']],
      limit: 150,
    })

    const deliveries: CustomerHistoryDelivery[] = deliveryDayModels.map(d => ({
      id: d.id,
      date: d.date,
      status: d.status,
      mealType: d.mealType,
      mealName: d.mealName,
    }))

    const issueModels = await DeliveryIssueModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    })

    const issues: CustomerHistoryIssue[] = issueModels.map(i => ({
      id: i.id,
      deliveryDate: i.deliveryDate,
      issueType: i.issueType,
      status: i.status,
      creditedAmountSar: i.creditedAmountSar !== null ? Number(i.creditedAmountSar) : null,
      rejectionReason: i.rejectionReason,
      createdAt: i.createdAt,
    }))

    return { subscriptions, deliveries, issues }
  }

  async deactivateCustomer(userId: string): Promise<void> {
    await UserModel.update({ isActive: false }, { where: { id: userId } })
  }
}
