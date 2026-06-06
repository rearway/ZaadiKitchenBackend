import { Deps } from '../../entitygateway/index.js'

export interface CancelSubscriptionInput {
  userId: string
}

export interface CancelSubscriptionOutput {
  subscription_id: string
  status: string
  deliveries_continue_until: string
  refund_sar: number
  message: string
}

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

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function makeUC(deps: Deps) {
  return async function cancelSubscription(
    input: CancelSubscriptionInput
  ): Promise<CancelSubscriptionOutput> {
    const { logger, subscriptionLoader, subscriptionPersistor, auditLogPersistor } = deps
    try {
      const { userId } = input

      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      if (
        subscription.status === 'cancelled' ||
        subscription.status === 'expired'
      ) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'Subscription is already cancelled or expired.'
        )
      }

      await subscriptionPersistor.updateSubscription(subscription.id, {
        status: 'cancelled',
      })

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'cancel_subscription',
      })

      const shortDate = formatShortDate(subscription.endDate)

      return {
        subscription_id: subscription.id,
        status: 'cancelled',
        deliveries_continue_until: subscription.endDate,
        refund_sar: 0,
        message: `Your plan has been cancelled. Deliveries will continue until ${shortDate}.`,
      }
    } catch (error) {
      logger.error(
        'Failed to cancel subscription',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CancelSubscription'
