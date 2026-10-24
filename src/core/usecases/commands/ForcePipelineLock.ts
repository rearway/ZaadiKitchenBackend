import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  ValidationError,
} from '../../../shared/errors/domain.errors.js'
import { computeEffectiveStage } from '../services/dailyOpsStage.js'
import {
  isAfterErpCutoff,
  isDeliveryWorkday,
} from '../services/erpCutoffUtils.js'
import {
  forceLockDeliveryDate,
  isForcePipelineLockEnabled,
} from '../services/forcePipelineLock.js'

export interface ForcePipelineLockInput {
  date: string
  forcedByUserId: string
}

function isRealIsoDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  )
}

export function makeUC(deps: Deps) {
  return async function forcePipelineLock(input: ForcePipelineLockInput) {
    const { logger, dailyOpsDayLoader } = deps

    try {
      if (!isForcePipelineLockEnabled()) {
        throw new ResourceNotFoundError('Endpoint')
      }

      if (!isRealIsoDate(input.date) || !isDeliveryWorkday(input.date)) {
        throw new ValidationError(
          'date must be a Sunday–Thursday delivery date in YYYY-MM-DD format'
        )
      }

      const day = await dailyOpsDayLoader.getByDate(input.date)
      const previousStage = computeEffectiveStage(day, input.date)
      if (previousStage === 'dispatch' || previousStage === 'delivered') {
        throw new ValidationError(
          `Cannot force-lock a date that is already '${previousStage}'.`
        )
      }

      forceLockDeliveryDate(input.date)
      logger.log(
        `Force-locked delivery date ${input.date} by ${input.forcedByUserId}`
      )

      return {
        date: input.date,
        previous_stage: previousStage,
        current_stage: computeEffectiveStage(day, input.date),
        frozen: isAfterErpCutoff(input.date),
      }
    } catch (error) {
      logger.error(
        'ForcePipelineLock failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ForcePipelineLock'
