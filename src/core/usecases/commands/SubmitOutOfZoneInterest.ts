import { Deps } from '../../entitygateway/index.js'

export interface SubmitOutOfZoneInterestInput {
  userId: string
  areaName: string
}

export type SubmitOutOfZoneInterestOutput = {
  message: string
  data: {
    message: string
    areaName: string
  }
}

export function makeUC(deps: Deps) {
  return async function submitOutOfZoneInterest(
    input: SubmitOutOfZoneInterestInput
  ): Promise<SubmitOutOfZoneInterestOutput> {
    const { logger, outOfZoneInterestPersistor } = deps
    try {
      const { userId, areaName } = input

      if (!areaName || areaName.trim().length < 2) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('AREA_NAME_REQUIRED', {
          message: 'Area name cannot be empty',
        })
      }

      const pastSubmissions =
        await outOfZoneInterestPersistor.getUserInterestCount(userId)
      if (pastSubmissions >= 3) {
        const { BaseError } = await import('../../../shared/errors/index.js')
        throw new BaseError(
          'SUBMISSION_LIMIT',
          429,
          'Max 3 out-of-zone submissions per session'
        )
      }

      await outOfZoneInterestPersistor.createInterest(userId, areaName.trim())

      return {
        message: 'Out of zone interest submitted',
        data: {
          message: "We'll notify you when we expand to this area.",
          areaName: areaName.trim(),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to submit out of zone interest',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SubmitOutOfZoneInterest'
