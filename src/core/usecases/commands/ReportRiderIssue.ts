import type { Deps } from '../../entitygateway/index.js'
import type { RiderIssueType } from '../../entities/RiderIssue.js'
import { DeliveryNotFoundError, ValidationError } from '../../../shared/errors/domain.errors.js'

export interface ReportRiderIssueInput {
  deliveryId: string
  riderId: string
  issueType: RiderIssueType
  notes?: string
}

export interface ReportRiderIssueOutput {
  message: string
  data: {
    rider_issue_id: string
    delivery_id: string
    issue_type: RiderIssueType
    notes: string | null
    reported_at: Date
  }
}

const VALID_ISSUE_TYPES: RiderIssueType[] = ['customer_not_found', 'wrong_address', 'access_denied', 'other']

export function makeUC(deps: Deps) {
  return async function reportRiderIssue(
    input: ReportRiderIssueInput
  ): Promise<ReportRiderIssueOutput> {
    const { logger, deliveryDayLoader, riderIssuePersistor } = deps

    try {
      if (!VALID_ISSUE_TYPES.includes(input.issueType)) {
        throw new ValidationError(`Invalid issue type. Must be one of: ${VALID_ISSUE_TYPES.join(', ')}`)
      }

      const deliveryDay = await deliveryDayLoader.getDeliveryDayById(input.deliveryId)
      if (!deliveryDay) throw new DeliveryNotFoundError()

      const issue = await riderIssuePersistor.createRiderIssue({
        deliveryDayId: input.deliveryId,
        riderId: input.riderId,
        issueType: input.issueType,
        notes: input.notes ?? null,
      })

      return {
        message: 'Issue reported successfully',
        data: {
          rider_issue_id: issue.id,
          delivery_id: issue.deliveryDayId,
          issue_type: issue.issueType,
          notes: issue.notes,
          reported_at: issue.createdAt,
        },
      }
    } catch (error) {
      logger.error('ReportRiderIssue failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'ReportRiderIssue'
