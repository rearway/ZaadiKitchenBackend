import type { Deps } from '../../entitygateway/index.js'
import type { MenuWeek } from '../../entities/index.js'

export interface UnpublishMenuWeekInput {
  weekId: string
}

export interface UnpublishMenuWeekOutput {
  message: string
  data: MenuWeek
}

export function makeUC(deps: Deps) {
  return async function unpublishMenuWeek(
    input: UnpublishMenuWeekInput
  ): Promise<UnpublishMenuWeekOutput> {
    const { logger, menuWeekLoader, menuWeekPersistor } = deps

    try {
      const { weekId } = input

      const week = await menuWeekLoader.getWeekById(weekId)
      if (!week) {
        const { ResourceNotFoundError } = await import(
          '../../../shared/errors/index.js'
        )
        throw new ResourceNotFoundError('MenuWeek', weekId)
      }

      if (week.status !== 'published') {
        const { ValidationError } = await import(
          '../../../shared/errors/index.js'
        )
        throw new ValidationError('MenuWeek is not published')
      }

      const unpublishedWeek = await menuWeekPersistor.unpublishWeek(weekId)

      return {
        message: 'Menu week unpublished successfully (moved to draft)',
        data: unpublishedWeek,
      }
    } catch (error) {
      logger.error(
        'UnpublishMenuWeek failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UnpublishMenuWeek'
