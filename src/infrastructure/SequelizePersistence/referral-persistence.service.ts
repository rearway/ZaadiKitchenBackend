import { Injectable } from '@nestjs/common'
import { fn, col, literal, Op } from 'sequelize'
import {
  ReferralLoader,
  ReferralPersistor,
  ReferralHistoryEntry,
} from '../../core/entitygateway/Referral.js'
import { UserReferral } from '../../core/entities/UserReferral.js'
import {
  UserReferralModel,
  UserModel,
  OrderModel,
  PlanModel,
} from './models/index.js'

@Injectable()
export class ReferralPersistenceService
  implements ReferralLoader, ReferralPersistor
{
  async getReferralStatsByUserId(userId: string): Promise<{
    referralCode: string
    friendsJoined: number
    totalEarnedSar: number
  }> {
    const user = await UserModel.findByPk(userId, {
      attributes: ['referralCode', 'fullName'],
    })
    const referralCode =
      user?.referralCode ??
      (await this.ensureReferralCode(userId, user?.fullName ?? ''))

    const result = await UserReferralModel.findOne({
      where: { referrerUserId: userId },
      attributes: [
        [fn('COUNT', col('id')), 'friendsJoined'],
        [
          fn('COALESCE', fn('SUM', col('reward_credited_sar')), literal('0')),
          'totalEarnedSar',
        ],
      ],
      raw: true,
    })
    const raw = result as unknown as {
      friendsJoined: string
      totalEarnedSar: string
    }

    return {
      referralCode,
      friendsJoined: Number(raw?.friendsJoined ?? 0),
      totalEarnedSar: Number(raw?.totalEarnedSar ?? 0),
    }
  }

  async getReferralHistory(userId: string): Promise<ReferralHistoryEntry[]> {
    const referrals = await UserReferralModel.findAll({
      where: { referrerUserId: userId },
      order: [['createdAt', 'DESC']],
    })

    if (referrals.length === 0) return []

    const referredUserIds = referrals.map(r => r.referredUserId)
    const referralCodes = referrals.map(r => r.referralCode)

    const [users, orders] = await Promise.all([
      UserModel.findAll({
        where: { id: { [Op.in]: referredUserIds } },
        attributes: ['id', 'fullName'],
      }),
      OrderModel.findAll({
        where: {
          userId: { [Op.in]: referredUserIds },
          promoCode: { [Op.in]: referralCodes },
          status: 'confirmed',
        },
        attributes: ['userId', 'promoCode', 'planId'],
      }),
    ])

    const planIds = [...new Set(orders.map(o => o.planId).filter(Boolean))]
    const plans = planIds.length
      ? await PlanModel.findAll({
          where: { id: { [Op.in]: planIds } },
          attributes: ['id', 'name'],
        })
      : []

    const userMap = new Map(users.map(u => [u.id, u.fullName ?? 'Unknown']))
    const planMap = new Map(plans.map(p => [p.id, p.name]))
    const orderMap = new Map(
      orders.map(o => [`${o.userId}:${o.promoCode}`, o.planId])
    )

    return referrals.map(r => {
      const planId =
        orderMap.get(`${r.referredUserId}:${r.referralCode}`) ?? null
      return {
        referredUserName: userMap.get(r.referredUserId) ?? 'Unknown',
        joinedAt: r.createdAt,
        planName: planId ? (planMap.get(planId) ?? null) : null,
        rewardCreditedSar: Number(r.rewardCreditedSar),
      }
    })
  }

  async getReferralByCode(code: string): Promise<UserReferral | null> {
    const model = await UserReferralModel.findOne({
      where: { referralCode: code },
    })
    return model ? this.toEntity(model) : null
  }

  async hasUserBeenReferred(referredUserId: string): Promise<boolean> {
    const count = await UserReferralModel.count({ where: { referredUserId } })
    return count > 0
  }

  async createReferral(
    input: Omit<UserReferral, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserReferral> {
    const model = await UserReferralModel.create({ ...input })
    return this.toEntity(model)
  }

  async markRewarded(id: string, rewardSar: number): Promise<void> {
    await UserReferralModel.update(
      { isRewarded: true, rewardCreditedSar: rewardSar },
      { where: { id } }
    )
  }

  async ensureReferralCode(userId: string, fullName: string): Promise<string> {
    const user = await UserModel.findByPk(userId, {
      attributes: ['referralCode'],
    })
    if (user?.referralCode) return user.referralCode

    const prefix = (fullName || 'USER')
      .replace(/\s+/g, '')
      .slice(0, 5)
      .toUpperCase()
    const suffix = Math.floor(1000 + Math.random() * 9000).toString()
    const code = `${prefix}${suffix}`

    await UserModel.update({ referralCode: code }, { where: { id: userId } })
    return code
  }

  private toEntity(model: UserReferralModel): UserReferral {
    return {
      id: model.id,
      referrerUserId: model.referrerUserId,
      referredUserId: model.referredUserId,
      referralCode: model.referralCode,
      rewardCreditedSar: Number(model.rewardCreditedSar),
      isRewarded: model.isRewarded,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
