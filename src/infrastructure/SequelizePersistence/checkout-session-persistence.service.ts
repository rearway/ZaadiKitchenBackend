import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
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
import { CheckoutSessionModel, PromoCodeModel } from './models/index.js'

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

  async expireAllUserSessions(userId: string): Promise<void> {
    await CheckoutSessionModel.update(
      { status: 'expired' },
      { where: { userId, status: 'active' } }
    )
  }

  async getPromoByCode(code: string): Promise<PromoCode | null> {
    const model = await PromoCodeModel.findOne({
      where: { code, isActive: true },
    })
    return model ? this.toPromoEntity(model) : null
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
