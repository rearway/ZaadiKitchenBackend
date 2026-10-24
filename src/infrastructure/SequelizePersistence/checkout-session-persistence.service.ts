import { Injectable } from '@nestjs/common'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import {
  CheckoutSessionLoader,
  CheckoutSessionPersistor,
} from '../../core/entitygateway/CheckoutSession.js'
import {
  PromoCodeLoader,
  PromoCodePersistor,
} from '../../core/entitygateway/PromoCode.js'
import { CheckoutSession } from '../../core/entities/CheckoutSession.js'
import { PromoCode } from '../../core/entities/PromoCode.js'
import {
  CheckoutSessionModel,
  PromoCodeModel,
  UserModel,
} from './models/index.js'

@Injectable()
export class CheckoutSessionPersistenceService
  implements
    CheckoutSessionLoader,
    CheckoutSessionPersistor,
    PromoCodeLoader,
    PromoCodePersistor
{
  async getSessionById(id: string): Promise<CheckoutSession | null> {
    const model = await CheckoutSessionModel.findByPk(id)
    return model ? this.toSessionEntity(model) : null
  }

  async getActiveSessionByUserId(
    userId: string
  ): Promise<CheckoutSession | null> {
    const model = await CheckoutSessionModel.findOne({
      where: {
        userId,
        status: 'active',
        expiresAt: { [Op.gt]: new Date() },
      },
    })
    return model ? this.toSessionEntity(model) : null
  }

  async createSession(
    input: Omit<CheckoutSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CheckoutSession> {
    const model = await CheckoutSessionModel.create({ ...input })
    return this.toSessionEntity(model)
  }

  async updateSession(
    id: string,
    updates: Partial<CheckoutSession>
  ): Promise<CheckoutSession> {
    await CheckoutSessionModel.update(updates, { where: { id } })
    const model = await CheckoutSessionModel.findByPk(id)
    return this.toSessionEntity(model!)
  }

  async claimSession(id: string): Promise<boolean> {
    const [affected] = await CheckoutSessionModel.update(
      { status: 'confirmed' },
      {
        where: {
          id,
          status: 'active',
          expiresAt: { [Op.gt]: new Date() },
        },
      }
    )
    return affected === 1
  }

  async expireAllUserSessions(userId: string): Promise<void> {
    await CheckoutSessionModel.update(
      { status: 'expired' },
      { where: { userId, status: 'active' } }
    )
  }

  async getPromoByCode(code: string): Promise<PromoCode | null> {
    const normalized = code.trim()
    if (!normalized) return null

    const model = await PromoCodeModel.findOne({
      where: { code: normalized, isActive: true },
    })
    if (model) return this.toPromoEntity(model)

    // Issued codes are stored on users.referral_code and are not copied into
    // promo_codes. Resolve those here so validate and checkout can see them.
    return this.findIssuedReferralPromo(normalized)
  }

  private async findIssuedReferralPromo(
    code: string
  ): Promise<PromoCode | null> {
    const exact = await UserModel.findOne({
      where: { referralCode: code },
      attributes: ['id', 'referralCode', 'createdAt', 'updatedAt'],
    })
    const user =
      exact ??
      (code.toUpperCase() === code
        ? null
        : await UserModel.findOne({
            where: sqlWhere(
              fn('UPPER', col('referral_code')),
              code.toUpperCase()
            ),
            attributes: ['id', 'referralCode', 'createdAt', 'updatedAt'],
          }))

    if (!user?.referralCode) return null

    return {
      id: user.id,
      code: user.referralCode,
      type: 'referral',
      discountSar: 0,
      ownerUserId: user.id,
      validForPlanSlug: null,
      maxUses: null,
      timesUsed: 0,
      isActive: true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  async createPromo(
    input: Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PromoCode> {
    const model = await PromoCodeModel.create({ ...input })
    return this.toPromoEntity(model)
  }

  async incrementTimesUsed(code: string): Promise<void> {
    await PromoCodeModel.increment('timesUsed', { where: { code } })
  }

  private toSessionEntity(model: CheckoutSessionModel): CheckoutSession {
    return {
      id: model.id,
      userId: model.userId,
      planId: model.planId,
      mealType: model.mealType,
      basePriceSar: Number(model.basePriceSar),
      walletCreditSar: Number(model.walletCreditSar),
      promoDiscountSar: Number(model.promoDiscountSar),
      totalDueSar: Number(model.totalDueSar),
      promoCode: model.promoCode,
      promoAttemptCount: model.promoAttemptCount,
      promoLocked: model.promoLocked,
      status: model.status,
      expiresAt: model.expiresAt,
      promotionSubscriptionId: model.promotionSubscriptionId ?? null,
      priorPlanCreditSar:
        model.priorPlanCreditSar != null
          ? Number(model.priorPlanCreditSar)
          : null,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  private toPromoEntity(model: PromoCodeModel): PromoCode {
    return {
      id: model.id,
      code: model.code,
      type: model.type,
      discountSar: Number(model.discountSar),
      ownerUserId: model.ownerUserId,
      validForPlanSlug: model.validForPlanSlug,
      maxUses: model.maxUses,
      timesUsed: model.timesUsed,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
