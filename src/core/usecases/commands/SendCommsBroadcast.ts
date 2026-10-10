import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, ValidationError } from '../../../shared/errors/domain.errors.js'
import {
  BROADCAST_SEGMENT_LABELS,
  BROADCAST_TITLE,
  isValidSegmentId,
  todayKSA,
  type BroadcastSegmentId,
} from '../services/commsUtils.js'

export interface SendCommsBroadcastInput {
  segmentId: string
  message: string
  adminUserId: string
}

export function makeUC(deps: Deps) {
  return async function sendCommsBroadcast(input: SendCommsBroadcastInput) {
    const { logger, commsLoader, commsPersistor, notificationGateway } = deps

    if (!isValidSegmentId(input.segmentId)) {
      throw new ResourceNotFoundError('Broadcast segment', input.segmentId)
    }

    const segmentId = input.segmentId as BroadcastSegmentId
    const today = todayKSA()
    const userIds = await commsLoader.getSegmentRecipientUserIds(segmentId, today)
    const recipientCount = userIds.length

    if (recipientCount === 0) {
      throw new ValidationError('Selected segment has no recipients', {
        error: 'SEGMENT_EMPTY',
      })
    }

    const endpoints = await commsLoader.getActiveDeviceEndpointsForUsers(userIds)

    await Promise.allSettled(
      endpoints.map(endpoint =>
        notificationGateway.sendSingleNotification(
          endpoint,
          BROADCAST_TITLE,
          input.message,
          { type: 'admin_broadcast', segment_id: segmentId }
        )
      )
    )

    const record = await commsPersistor.createBroadcastRecord({
      segmentId,
      message: input.message,
      recipientCount,
      sentByUserId: input.adminUserId,
    })

    logger.log(
      `Comms broadcast ${record.id} sent to ${recipientCount} subscribers (${endpoints.length} devices) in segment ${segmentId}`
    )

    return {
      data: {
        broadcast_id: record.id,
        segment_id: segmentId,
        segment_label: BROADCAST_SEGMENT_LABELS[segmentId],
        recipient_count: recipientCount,
        status: 'sent' as const,
        sent_at: record.sentAt.toISOString(),
      },
    }
  }
}

export const name = 'SendCommsBroadcast'
