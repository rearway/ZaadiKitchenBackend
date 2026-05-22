import { Injectable } from '@nestjs/common'
import { fn, col, literal } from 'sequelize'
import {
  ReferralLoader,
  ReferralPersistor,
} from '../../core/entitygateway/Referral.js'
import { UserReferral } from '../../core/entities/UserReferral.js'
import { UserReferralModel, UserModel } from './models/index.js'

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
