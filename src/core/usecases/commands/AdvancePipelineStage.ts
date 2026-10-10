import type { Deps } from '../../entitygateway/index.js'
import { computeEffectiveStage, nextStage, PipelineStage } from '../services/dailyOpsStage.js'
import { StageMismatchError, ValidationError } from '../../../shared/errors/domain.errors.js'

export interface AdvancePipelineStageInput {
  date: string
  fromStage: PipelineStage
  toStage: 'dispatch' | 'delivered'
  advancedByUserId: string
}

export function makeUC(deps: Deps) {
  return async function advancePipelineStage(input: AdvancePipelineStageInput) {
    const { logger, dailyOpsDayLoader, dailyOpsDayPersistor, userLoader } = deps

    try {
      const day = await dailyOpsDayLoader.getByDate(input.date)
      const currentStage = computeEffectiveStage(day, input.date)

      if (currentStage !== input.fromStage) {
        throw new StageMismatchError(currentStage, input.fromStage)
      }

      const expectedNext = nextStage(currentStage)
      if (expectedNext !== input.toStage) {
        throw new ValidationError(
          `Cannot advance from '${currentStage}' to '${input.toStage}'. The next stage is '${expectedNext ?? 'none'}'.`
        )
      }

      const updated = await dailyOpsDayPersistor.advanceStage(input.date, input.toStage, input.advancedByUserId)
      const advancedByUser = await userLoader.getUserById(input.advancedByUserId)

      const advancedAt = input.toStage === 'delivered' ? updated.deliveredAt! : updated.dispatchedAt!

      return {
        date: input.date,
        previous_stage: input.fromStage,
        current_stage: input.toStage,
        advanced_at: advancedAt,
        advanced_by: advancedByUser?.fullName ?? input.advancedByUserId,
      }
    } catch (error) {
      logger.error('AdvancePipelineStage failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'AdvancePipelineStage'
