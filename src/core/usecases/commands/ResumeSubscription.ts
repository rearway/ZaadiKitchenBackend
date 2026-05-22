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
    const { logger, subscriptionLoader, subscriptionPersistor } = deps
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

      await subscriptionPersistor.updateSubscription(subscription.id, {
        status: 'active',
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
      })

      return {
        subscription_id: subscription.id,
        status: 'active',
        resume_date: resumeDate,
        first_delivery_label: formatDeliveryLabel(resumeDate),
        pause_days_used: subscription.pauseDaysUsed,
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
