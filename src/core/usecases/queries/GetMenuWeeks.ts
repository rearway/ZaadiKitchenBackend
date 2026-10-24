import type { Deps } from '../../entitygateway/index.js'
import type { MenuWeek } from '../../entities/MenuWeek.js'
import {
  formatWeekRangeLabel,
  getAdminPlannableWeeks,
  getAdminVisibleWeeks,
  getKsaSaudiWorkWeekBounds,
  getSaudiWorkWeekBounds,
  isAdminWeekLocked,
} from '../services/weekUtils.js'
import {
  evaluateWeekPublishReadiness,
  isWeekEditable,
} from '../services/menuWeekPublish.js'

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
  return async function getMenuWeeks(
    input: GetMenuWeeksInput
  ): Promise<GetMenuWeeksOutput> {
    const { logger, menuWeekLoader, menuWeekPersistor } = deps

    try {
      const now = new Date()
      const serviceWeek = getKsaSaudiWorkWeekBounds(now)
      const plannable = getAdminPlannableWeeks(now)
      const visible = getAdminVisibleWeeks(now)

      // Current week and the immediate next week always exist.
      // The week two ahead is created only after Thursday 18:00 Asia/Riyadh.
      await Promise.all(
        plannable.map(bounds => menuWeekPersistor.ensureWeekExists(bounds))
      )

      const plannerHome =
        !input.fromWeek || input.fromWeek === serviceWeek.weekId
      let weeks: MenuWeek[]
      if (plannerHome) {
        const loaded = await Promise.all(
          visible.map(bounds => menuWeekLoader.getWeekById(bounds.weekId))
        )
        weeks = loaded.filter((week): week is MenuWeek => week != null)
      } else {
        const count = Math.min(8, Math.max(1, input.count ?? 2))
        const listed = await menuWeekLoader.getWeeks({
          fromWeek: input.fromWeek,
          count,
        })
        weeks = listed.filter(week => !isAdminWeekLocked(week.dateFrom, now))
      }

      const mappedWeeks = await Promise.all(
        weeks.map(async week => {
          const slots = await menuWeekLoader.getSlotsByWeekId(week.id)
          const readiness = evaluateWeekPublishReadiness(slots)
          const totalDays = readiness.totalDays || 5
          const filledDays = readiness.filledDays

          const isCurrentWeek = week.id === serviceWeek.weekId
          const isEditable = isWeekEditable(week.status)
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
            label: isCurrentWeek
              ? `Week ${week.weekNumber} — Current`
              : `Week ${week.weekNumber}`,
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
      logger.error(
        'GetMenuWeeks failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetMenuWeeks'
