import type { Deps } from '../../entitygateway/index.js'
import {
  BROADCAST_SEGMENT_IDS,
  BROADCAST_SEGMENT_LABELS,
  todayKSA,
} from '../services/commsUtils.js'

export function makeUC(deps: Deps) {
  return async function getBroadcastSegments() {
    const { commsLoader } = deps
    const today = todayKSA()
    const counts = await commsLoader.getBroadcastSegmentCounts(today)

    return {
      data: {
        segments: BROADCAST_SEGMENT_IDS.map(segmentId => ({
          segment_id: segmentId,
          label: BROADCAST_SEGMENT_LABELS[segmentId],
          recipient_count: counts[segmentId],
        })),
        as_of: new Date().toISOString(),
      },
    }
  }
}

export const name = 'GetBroadcastSegments'
