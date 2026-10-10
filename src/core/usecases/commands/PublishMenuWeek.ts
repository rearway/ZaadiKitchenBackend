import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  WeekAlreadyPublishedError,
} from '../../../shared/errors/domain.errors.js'

export interface PublishMenuWeekInput {
  weekId: string
  publishedByUserId: string
}

export interface PublishMenuWeekOutput {
  week_id: string
  status: 'published'
  published_at: Date
  published_by: string
  customer_visible_from: string
}

export function makeUC(deps: Deps) {
  return async function publishMenuWeek(
    input: PublishMenuWeekInput
  ): Promise<PublishMenuWeekOutput> {
    const {
      logger,
      menuWeekLoader,
      menuWeekPersistor,
      mealPersistor,
      userLoader,
    } = deps

    try {
      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      if (week.status === 'published') throw new WeekAlreadyPublishedError()

      const allSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)

      const publishedWeek = await menuWeekPersistor.publishWeek(
        input.weekId,
        input.publishedByUserId
      )

      // Update last_served and times_served only for slots that have a meal
      const mealIds = allSlots
        .filter(s => s.mealId)
        .map(s => s.mealId as string)
      await mealPersistor.updateLastServed(mealIds, week.dateFrom)
      await mealPersistor.incrementTimesServed(mealIds)

      const publisher = await userLoader.getUserById(input.publishedByUserId)

      return {
        week_id: publishedWeek.id,
        status: 'published',
        published_at: publishedWeek.publishedAt!,
        published_by: publisher?.fullName ?? input.publishedByUserId,
        customer_visible_from: week.dateFrom,
      }
    } catch (error) {
      logger.error(
        'PublishMenuWeek failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'PublishMenuWeek'
