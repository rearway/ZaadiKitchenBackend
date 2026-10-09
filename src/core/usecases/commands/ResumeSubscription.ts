import { Deps } from '../../entitygateway/index.js'
import { todayKSA } from '../services/revenueUtils.js'
import { compareDateStrings, isAfterSkipCutoff } from '../services/weekUtils.js'
import {
  addDaysUtc,
  buildDeliveryDayInputs,
  generateWorkingDeliveryDates,
  toYYYYMMDD,
} from '../services/deliveryScheduleUtils.js'
import {
  countWorkingDaysInRange,
  flexUsedUpdate,
  getFlexDaysAllowed,
  getFlexDaysUsed,
} from '../services/flexDays.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'

export interface ResumeSubscriptionInput {
  userId: string
  resumeDate: string
}

export interface ResumeSubscriptionOutput {
  subscription_id: string
  status: string
  resume_date: string
  first_delivery_label: string
  pause_days_used: number
  pause_days_remaining: number
  skip_days_used: number
  skip_days_remaining: number
  skip_pause_days_remaining: number
  lapsed_days: number
  new_end_date: string
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatDeliveryLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]}`
}

export function makeUC(deps: Deps) {
  return async function resumeSubscription(
    input: ResumeSubscriptionInput
  ): Promise<ResumeSubscriptionOutput> {
    const {
      logger,
      subscriptionLoader,
      subscriptionPersistor,
      deliveryDayLoader,
      deliveryDayPersistor,
      publicHolidayLoader,
      auditLogPersistor,
    } = deps
    try {
      const { userId, resumeDate } = input

      let subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }
      subscription = await ensurePauseStatus(deps, subscription)

      const { ValidationError } =
        await import('../../../shared/errors/index.js')

      if (subscription.status !== 'paused') {
        throw new ValidationError('Only paused subscriptions can be resumed.')
      }

      const pausedFrom = subscription.pausedFrom!
      const pausedUntil = subscription.pausedUntil!

      const today = todayKSA()
      const tomorrow = toYYYYMMDD(
        addDaysUtc(new Date(today + 'T00:00:00Z'), 1)
      )

      // Resume only from the next day (after pause state has started).
      if (compareDateStrings(resumeDate, tomorrow) < 0) {
        throw new ValidationError(
          'You can only resume from tomorrow or a later date.',
          {
            fields: {
              resume_date: `Earliest resume date is ${tomorrow}.`,
            },
          }
        )
      }

      if (compareDateStrings(resumeDate, pausedUntil) > 0) {
        throw new ValidationError(
          'Resume date cannot be after the pause end date.',
          {
            fields: {
              resume_date: `Pause ends on ${pausedUntil}.`,
            },
          }
        )
      }

      // Resume must be before pause-end cutoff.
      if (isAfterSkipCutoff(pausedUntil)) {
        throw new ValidationError(
          'The cutoff for the pause end day has passed; this pause can no longer be resumed early.'
        )
      }

      const effectiveResumeDate =
        compareDateStrings(resumeDate, pausedFrom) < 0
          ? pausedFrom
          : resumeDate

      const holidayTo = toYYYYMMDD(
        addDaysUtc(new Date(pausedUntil + 'T00:00:00Z'), 1)
      )
      const holidayDates = new Set(
        await publicHolidayLoader.getHolidayDates(pausedFrom, holidayTo)
      )

      // Working days already consumed (from pause start through day before resume).
      const dayBeforeResume = toYYYYMMDD(
        addDaysUtc(new Date(effectiveResumeDate + 'T00:00:00Z'), -1)
      )
      const consumedWorkingDays =
        compareDateStrings(dayBeforeResume, pausedFrom) >= 0
          ? countWorkingDaysInRange(
              pausedFrom,
              dayBeforeResume,
              holidayDates
            )
          : 0

      const totalReserved = countWorkingDaysInRange(
        pausedFrom,
        pausedUntil,
        holidayDates
      )
      const refundWorkingDays = Math.max(0, totalReserved - consumedWorkingDays)

      // Restore paused delivery days from resumeDate through pausedUntil → scheduled
      await deliveryDayPersistor.bulkUpdateDeliveryDayStatus(
        subscription.id,
        effectiveResumeDate,
        pausedUntil,
        'paused',
        'scheduled'
      )

      // Lapsed = still-paused days before resume (missed)
      const lapsedDays = await deliveryDayLoader.getDeliveryDaysBySubscription(
        subscription.id,
        {
          from: pausedFrom,
          to: dayBeforeResume < pausedFrom ? pausedFrom : dayBeforeResume,
        }
      )
      const lapsedCount = lapsedDays.filter(d => d.status === 'paused').length

      let newEndDate = subscription.endDate
      if (lapsedCount > 0) {
        const extHolidays = new Set(
          await publicHolidayLoader.getHolidayDates(
            subscription.endDate,
            toYYYYMMDD(
              addDaysUtc(new Date(subscription.endDate + 'T00:00:00Z'), 90)
            )
          )
        )
        const searchStart = toYYYYMMDD(
          addDaysUtc(new Date(subscription.endDate + 'T00:00:00Z'), 1)
        )
        const extensionDates = generateWorkingDeliveryDates(
          searchStart,
          lapsedCount,
          extHolidays
        )
        if (extensionDates.length > 0) {
          await deliveryDayPersistor.bulkCreateDeliveryDays(
            buildDeliveryDayInputs(
              extensionDates,
              subscription.mealType,
              subscription.id,
              userId
            )
          )
          newEndDate = extensionDates[extensionDates.length - 1]
        }
      }

      const newFlexUsed = Math.max(
        0,
        getFlexDaysUsed(subscription) - refundWorkingDays
      )

      await subscriptionPersistor.updateSubscription(subscription.id, {
        status: 'active',
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
        endDate: newEndDate,
        ...flexUsedUpdate(newFlexUsed),
      })

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'resume_subscription',
        metadata: {
          resume_date: effectiveResumeDate,
          lapsed_days: lapsedCount,
          refunded_working_days: refundWorkingDays,
          new_end_date: newEndDate,
        },
      })

      const remaining = getFlexDaysAllowed(subscription) - newFlexUsed
      return {
        subscription_id: subscription.id,
        status: 'active',
        resume_date: effectiveResumeDate,
        first_delivery_label: formatDeliveryLabel(effectiveResumeDate),
        pause_days_used: newFlexUsed,
        pause_days_remaining: remaining,
        skip_days_used: newFlexUsed,
        skip_days_remaining: remaining,
        skip_pause_days_remaining: remaining,
        lapsed_days: lapsedCount,
        new_end_date: newEndDate,
      }
    } catch (error) {
      logger.error(
        'Failed to resume subscription',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ResumeSubscription'
