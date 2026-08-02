import { Injectable } from '@nestjs/common'
import type { DailyOpsDayLoader, DailyOpsDayPersistor } from '../../core/entitygateway/DailyOpsDay.js'
import type { DailyOpsDay } from '../../core/entities/DailyOpsDay.js'
import { DailyOpsDayModel } from './models/index.js'

@Injectable()
export class DailyOpsPersistenceService implements DailyOpsDayLoader, DailyOpsDayPersistor {
  async getByDate(date: string): Promise<DailyOpsDay | null> {
    const model = await DailyOpsDayModel.findByPk(date)
    return model ? this.toEntity(model) : null
  }

  async advanceStage(
    date: string,
    toStage: 'dispatch' | 'delivered',
    advancedByUserId: string
  ): Promise<DailyOpsDay> {
    const [model] = await DailyOpsDayModel.findOrCreate({
      where: { date },
      defaults: { date },
    })

    if (toStage === 'dispatch') {
      await model.update({ dispatchedAt: new Date(), dispatchedBy: advancedByUserId })
    } else {
      await model.update({ deliveredAt: new Date(), deliveredBy: advancedByUserId })
    }

    return this.toEntity(model)
  }

  private toEntity(model: DailyOpsDayModel): DailyOpsDay {
    return {
      date: model.date,
      dispatchedAt: model.dispatchedAt,
      dispatchedById: model.dispatchedBy,
      deliveredAt: model.deliveredAt,
      deliveredById: model.deliveredBy,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
