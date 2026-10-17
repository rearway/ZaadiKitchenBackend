import type { Deps } from '../../entitygateway/index.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds, formatWeekRangeLabel } from '../services/weekUtils.js'
import { evaluateWeekPublishReadiness } from '../services/menuWeekPublish.js'

export interface GetMenuWeeksInput {
  fromWeek?: string
  count?: number
}

export interface GetMenuWeeksOutput {
  weeks: Array<{
    week_id: string
    week_number: number
    label: string
    date_range: string
    date_from: string
    date_to: string
    status: string
    is_current_week: boolean
    is_editable: boolean
    fill_status: {
      filled_days: number
      total_days: number
      label: string
    }
  }>
  nav: {
    prev_week: string | null
    next_week: string | null
  }
}

export function makeUC(deps: Deps) {
  return async function getMenuWeeks(input: GetMenuWeeksInput): Promise<GetMenuWeeksOutput> {
    const { logger, menuWeekLoader, menuWeekPersistor } = deps

    try {
      const now = new Date()
      const currentWeekBounds = getSaudiWorkWeekBounds(now)
      const nextWeekBounds = getNextSaudiWorkWeekBounds(now)

      // Auto-ensure current and next weeks exist
      await Promise.all([
        menuWeekPersistor.ensureWeekExists(currentWeekBounds),
        menuWeekPersistor.ensureWeekExists(nextWeekBounds),
      ])

      const count = Math.min(8, Math.max(1, input.count ?? 2))
      const fromWeek = input.fromWeek ?? currentWeekBounds.weekId
      const weeks = await menuWeekLoader.getWeeks({ fromWeek, count })

      const mappedWeeks = await Promise.all(
        weeks.map(async week => {
          const slots = await menuWeekLoader.getSlotsByWeekId(week.id)
          const readiness = evaluateWeekPublishReadiness(slots)
          const totalDays = readiness.totalDays || 5
          const filledDays = readiness.filledDays

          const isCurrentWeek = week.id === currentWeekBounds.weekId
          const isEditable = week.status === 'draft'
          const isPublished = week.status === 'published'

          let fillLabel: string
          if (isPublished) {
            fillLabel = 'Published ✓'
          } else if (week.status === 'past') {
            fillLabel = 'Archived'
          } else {
            fillLabel = `${filledDays} of ${totalDays} days filled`
          }

          return {
            week_id: week.id,
            week_number: week.weekNumber,
            label: isCurrentWeek ? `Week ${week.weekNumber} — Current` : `Week ${week.weekNumber}`,
            date_range: formatWeekRangeLabel(week.dateFrom, week.dateTo),
            date_from: week.dateFrom,
            date_to: week.dateTo,
            status: week.status,
            is_current_week: isCurrentWeek,
            is_editable: isEditable,
            fill_status: {
              filled_days: filledDays,
              total_days: totalDays,
              label: fillLabel,
            },
          }
        })
      )

      // Build nav: prev is the week before the first returned, next is after the last
      const firstWeek = weeks[0]
      const lastWeek = weeks[weeks.length - 1]

      const prevWeekId = firstWeek
        ? (() => {
            const prevSunday = new Date(firstWeek.dateFrom)
            prevSunday.setDate(prevSunday.getDate() - 7)
            return getSaudiWorkWeekBounds(prevSunday).weekId
          })()
        : null

      const nextWeekId = lastWeek
        ? (() => {
            const nextSunday = new Date(lastWeek.dateFrom)
            nextSunday.setDate(nextSunday.getDate() + 7)
            return getSaudiWorkWeekBounds(nextSunday).weekId
          })()
        : null

      return {
        weeks: mappedWeeks,
        nav: {
          prev_week: prevWeekId,
          next_week: nextWeekId,
        },
      }
    } catch (error) {
      logger.error('GetMenuWeeks failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMenuWeeks'
