import { Deps } from '../../entitygateway/index.js'
import { isSubscriptionInServicePeriod } from '../services/subscriptionServicePeriod.js'

export interface ResubscribeSubscriptionInput {
  userId: string
}

export interface ResubscribeSubscriptionOutput {
  subscription_id: string
  status: string
  end_date: string
  message: string
}

export function makeUC(deps: Deps) {
  return async function resubscribeSubscription(
    input: ResubscribeSubscriptionInput
  ): Promise<ResubscribeSubscriptionOutput> {
    const { logger, subscriptionLoader, subscriptionPersistor, auditLogPersistor } =
      deps

    try {
      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(input.userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      if (subscription.status !== 'cancelled') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        const message =
          subscription.status === 'active'
            ? 'Your subscription is already active.'
            : subscription.status === 'paused'
              ? 'Your subscription is paused. Use resume to continue deliveries.'
              : 'Only a cancelled subscription can be resubscribed.'
        throw new ValidationError(message)
      }

      if (!isSubscriptionInServicePeriod(subscription)) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'Your plan has ended. Please purchase a new subscription from the plans screen.'
        )
      }

      await subscriptionPersistor.updateSubscription(subscription.id, {
        status: 'active',
      })

      await auditLogPersistor.createAuditLog({
        userId: input.userId,
        subscriptionId: subscription.id,
        action: 'resubscribe_subscription',
      })

      return {
        subscription_id: subscription.id,
        status: 'active',
        end_date: subscription.endDate,
        message: 'Your subscription is active again.',
      }
    } catch (error) {
      logger.error(
        'Failed to resubscribe subscription',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ResubscribeSubscription'
