import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, IssueAlreadyResolvedError } from '../../../shared/errors/domain.errors.js'

export interface RejectDeliveryIssueInput {
  issueId: string
  reason: string
  note?: string
  resolvedByUserId: string
}

export function makeUC(deps: Deps) {
  return async function rejectDeliveryIssue(input: RejectDeliveryIssueInput) {
    const { logger, deliveryIssueLoader, deliveryIssuePersistor, userLoader, notificationGateway, userDeviceLoader } = deps

    try {
      const issue = await deliveryIssueLoader.getIssueById(input.issueId)
      if (!issue) throw new ResourceNotFoundError('DeliveryIssue', input.issueId)
      if (issue.status !== 'open') throw new IssueAlreadyResolvedError()

      const resolved = await deliveryIssuePersistor.resolveIssue(input.issueId, 'rejected', {
        rejectionReason: input.reason,
        rejectionNotes: input.note,
      })

      try {
        const devices = await userDeviceLoader.getDevicesByUserId(issue.userId)
        await Promise.allSettled(
          devices.map(device =>
            notificationGateway.sendSingleNotification(
              device.endpointArn,
              'Issue Update',
              `Your issue was reviewed: ${input.reason}`,
              { type: 'issue_rejected', issueId: issue.id }
            )
          )
        )
      } catch (notifyError) {
        logger.error('Failed to send Reject push notification', String(notifyError))
      }

      const resolvedByUser = await userLoader.getUserById(input.resolvedByUserId)

      return {
        issue_id: resolved.id,
        status: 'resolved',
        resolution: 'rejected',
        resolved_at: resolved.updatedAt,
        resolved_by: resolvedByUser?.fullName ?? input.resolvedByUserId,
        customer_notified: true,
      }
    } catch (error) {
      logger.error('RejectDeliveryIssue failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'RejectDeliveryIssue'
