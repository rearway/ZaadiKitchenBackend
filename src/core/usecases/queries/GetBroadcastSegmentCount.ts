import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import { isValidSegmentId, todayKSA, type BroadcastSegmentId } from '../services/commsUtils.js'

export interface GetBroadcastSegmentCountInput {
  segmentId: string
}

export function makeUC(deps: Deps) {
  return async function getBroadcastSegmentCount(input: GetBroadcastSegmentCountInput) {
    const { commsLoader } = deps

    if (!isValidSegmentId(input.segmentId)) {
      throw new ResourceNotFoundError('Broadcast segment', input.segmentId)
    }

    const segmentId = input.segmentId as BroadcastSegmentId
    const today = todayKSA()
    const counts = await commsLoader.getBroadcastSegmentCounts(today)

    return {
      data: {
        segment_id: segmentId,
        recipient_count: counts[segmentId],
      },
    }
  }
}

export const name = 'GetBroadcastSegmentCount'
