import { Deps } from '../../entitygateway/index.js'
import { IssueType, DeliveryIssue } from '../../entities/DeliveryIssue.js'
import { ValidationError, ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface SubmitDeliveryIssueInput {
  userId: string
  deliveryDate: string
  issueType: IssueType
  description?: string
}

export interface SubmitDeliveryIssueOutput {
  message: string
  data: DeliveryIssue
}

const VALID_ISSUE_TYPES: IssueType[] = ['wrong_order', 'quality_issue', 'not_delivered', 'damaged']

export function makeUC(deps: Deps) {
  return async function submitDeliveryIssue(
    input: SubmitDeliveryIssueInput
  ): Promise<SubmitDeliveryIssueOutput> {
    const { logger, subscriptionLoader, deliveryIssuePersistor } = deps

    try {
      const { userId, deliveryDate, issueType, description } = input

      if (!VALID_ISSUE_TYPES.includes(issueType)) {
        throw new ValidationError(`Invalid issue type. Must be one of: ${VALID_ISSUE_TYPES.join(', ')}`)
      }

      const subscription = await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        throw new ResourceNotFoundError('Subscription')
      }

      const issue = await deliveryIssuePersistor.createIssue({
        userId,
        subscriptionId: subscription.id,
        deliveryDate,
        issueType,
        description,
      })

      return {
        message: 'Issue reported successfully',
        data: issue,
      }
    } catch (error) {
      logger.error('Failed to submit delivery issue', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'SubmitDeliveryIssue'
