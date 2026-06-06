import { Deps } from '../../entitygateway/index.js'

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

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isWorkingDay(date: Date): boolean {
  const dow = date.getDay()
  return dow >= 0 && dow <= 4
}

function generateExtensionDays(
  afterDate: string,
  count: number,
  mealType: 'executive' | 'salad',
  subscriptionId: string,
  userId: string,
  holidaySet: Set<string>
): Array<
  Omit<
    import('../../entities/DeliveryDay.js').DeliveryDay,
    'id' | 'createdAt' | 'updatedAt'
  >
> {
  const days: Array<
    Omit<
      import('../../entities/DeliveryDay.js').DeliveryDay,
      'id' | 'createdAt' | 'updatedAt'
    >
  > = []
  let cursor = addDays(new Date(afterDate + 'T00:00:00Z'), 1)
  let maxIterations = 500

  while (days.length < count && maxIterations-- > 0) {
    const dateStr = toYYYYMMDD(cursor)
    if (isWorkingDay(cursor) && !holidaySet.has(dateStr)) {
      days.push({
        subscriptionId,
        userId,
        date: dateStr,
        mealType,
        mealName: null,
        status: 'scheduled',
      })
    }
    cursor = addDays(cursor, 1)
  }
  return days
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
    } = deps
    try {
      const { userId, resumeDate } = input

      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      if (subscription.status !== 'paused') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('Only paused subscriptions can be resumed.')
      }

      const pausedFrom = subscription.pausedFrom!
      const pausedUntil = subscription.pausedUntil!

      // Clamp resumeDate to the pause window
      const effectiveResumeDate =
        resumeDate < pausedFrom ? pausedFrom : resumeDate
      const effectivePausedUntil = pausedUntil

      // 1. Restore paused delivery days from resumeDate to pausedUntil → scheduled
      const restoredCount =
        await deliveryDayPersistor.bulkUpdateDeliveryDayStatus(
          subscription.id,
          effectiveResumeDate,
          effectivePausedUntil,
          'paused',
          'scheduled'
        )

      // 2. Count lapsed days (paused days before resumeDate that are now lost)
      const lapsedDays = await deliveryDayLoader.getDeliveryDaysBySubscription(
        subscription.id,
        {
          from: pausedFrom,
          to:
            effectiveResumeDate < pausedFrom
              ? pausedFrom
              : toYYYYMMDD(
                  addDays(new Date(effectiveResumeDate + 'T00:00:00Z'), -1)
                ),
        }
      )
      const lapsedCount = lapsedDays.filter(d => d.status === 'paused').length

      // 3. If there are lapsed days, extend the subscription by generating new delivery days after endDate
      let newEndDate = subscription.endDate
      if (lapsedCount > 0) {
        const holidayDates = new Set(
          await publicHolidayLoader.getHolidayDates(
            subscription.endDate,
            toYYYYMMDD(
              addDays(new Date(subscription.endDate + 'T00:00:00Z'), 90)
            )
          )
        )
        const extensionDays = generateExtensionDays(
          subscription.endDate,
          lapsedCount,
          subscription.mealType,
          subscription.id,
          userId,
          holidayDates
        )
        if (extensionDays.length > 0) {
          const created =
            await deliveryDayPersistor.bulkCreateDeliveryDays(extensionDays)
          newEndDate = created[created.length - 1].date
        }
      } else if (restoredCount > 0) {
        // Restored days may extend past the current endDate — recalculate
        const allDays = await deliveryDayLoader.getDeliveryDaysBySubscription(
          subscription.id
        )
        const lastScheduled = allDays.filter(d => d.status !== 'paused').at(-1)
        if (lastScheduled && lastScheduled.date > newEndDate) {
          newEndDate = lastScheduled.date
        }
      }

      // 4. Update subscription
      await subscriptionPersistor.updateSubscription(subscription.id, {
        status: 'active',
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
        endDate: newEndDate,
      })

      await deps.auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'resume_subscription',
        metadata: {
          resume_date: effectiveResumeDate,
          lapsed_days: lapsedCount,
          new_end_date: newEndDate,
        },
      })

      return {
        subscription_id: subscription.id,
        status: 'active',
        resume_date: effectiveResumeDate,
        first_delivery_label: formatDeliveryLabel(effectiveResumeDate),
        pause_days_used: subscription.pauseDaysUsed,
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
