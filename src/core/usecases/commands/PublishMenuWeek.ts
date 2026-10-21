import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceNotFoundError,
  WeekAlreadyPublishedError,
  WeekNotCompleteError,
} from '../../../shared/errors/domain.errors.js'
import { evaluateWeekPublishReadiness } from '../services/menuWeekPublish.js'

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
      mealLoader,
      mealPersistor,
      userLoader,
    } = deps

    try {
      const week = await menuWeekLoader.getWeekById(input.weekId)
      if (!week) throw new ResourceNotFoundError('MenuWeek', input.weekId)

      if (week.status === 'published') throw new WeekAlreadyPublishedError()

      const allSlots = await menuWeekLoader.getSlotsByWeekId(input.weekId)
      const mealIds = [
        ...new Set(allSlots.filter(s => s.mealId).map(s => s.mealId as string)),
      ]
      const meals =
        mealIds.length > 0 ? await mealLoader.getMealsByIds(mealIds) : []
      const readiness = evaluateWeekPublishReadiness(allSlots, meals)
      if (!readiness.publishReady) {
        throw new WeekNotCompleteError(
          readiness.blockedReason ?? 'Menu week is not ready to publish'
        )
      }

      const publishedWeek = await menuWeekPersistor.publishWeek(
        input.weekId,
        input.publishedByUserId
      )

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
