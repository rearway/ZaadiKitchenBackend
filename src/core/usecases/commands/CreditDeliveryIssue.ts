import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, IssueAlreadyResolvedError, ValidationError } from '../../../shared/errors/domain.errors.js'

export interface CreditDeliveryIssueInput {
  issueId: string
  creditSar: number
  note?: string
  resolvedByUserId: string
}

export function makeUC(deps: Deps) {
  return async function creditDeliveryIssue(input: CreditDeliveryIssueInput) {
    const { logger, deliveryIssueLoader, deliveryIssuePersistor, walletPersistor, userLoader, notificationGateway } = deps

    try {
      const issue = await deliveryIssueLoader.getIssueById(input.issueId)
      if (!issue) throw new ResourceNotFoundError('DeliveryIssue', input.issueId)
      if (issue.status !== 'open') throw new IssueAlreadyResolvedError()

      if (input.creditSar <= 0 || input.creditSar > 500) {
        throw new ValidationError('Amount must be between 1 and 500 SAR')
      }

      await walletPersistor.createTransaction({
        userId: issue.userId,
        type: 'credit',
        amountSar: input.creditSar,
        label: 'Issue credit',
        description: input.note ?? null,
        referenceId: issue.id,
      })

      const resolved = await deliveryIssuePersistor.resolveIssue(input.issueId, 'credited', {
        creditedAmountSar: input.creditSar,
      })

      await notificationGateway.notify(
        issue.userId,
        `Your issue has been resolved. SAR ${input.creditSar} has been added to your wallet.`
      )

      const resolvedByUser = await userLoader.getUserById(input.resolvedByUserId)

      return {
        issue_id: resolved.id,
        status: 'resolved',
        resolution: 'credit',
        credit_sar: input.creditSar,
        resolved_at: resolved.updatedAt,
        resolved_by: resolvedByUser?.fullName ?? input.resolvedByUserId,
        customer_notified: true,
      }
    } catch (error) {
      logger.error('CreditDeliveryIssue failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'CreditDeliveryIssue'
