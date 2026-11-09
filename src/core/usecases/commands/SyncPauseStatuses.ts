import { Deps } from '../../entitygateway/index.js'
import type { Subscription } from '../../entities/Subscription.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import { compareDateStrings } from '../services/weekUtils.js'
import { todayKSA } from '../services/revenueUtils.js'

export interface SyncPauseStatusesInput {
  /** Override "now" for tests / backfill. Defaults to current instant. */
  now?: Date
  /** Override KSA calendar day for pause-end. Defaults to todayKSA(now). */
  asOfDate?: string
}

export interface SyncPauseStatusesOutput {
  paused_count: number
  completed_count: number
  scanned_count: number
  as_of_date: string
}

/**
 * After the pause window's last day (paused_until), clear pause metadata.
 * Flex was charged when the pause was booked — no refund on natural end.
 */
async function completeEndedPause(
  deps: Pick<Deps, 'subscriptionPersistor'>,
  subscription: Subscription,
  asOfDate: string
): Promise<Subscription | null> {
  if (!subscription.pausedFrom || !subscription.pausedUntil) {
    return null
  }
  if (compareDateStrings(asOfDate, subscription.pausedUntil) <= 0) {
    return null
  }

  const nextStatus =
    subscription.status === 'paused' ? 'active' : subscription.status

  return deps.subscriptionPersistor.updateSubscription(subscription.id, {
    status: nextStatus,
    pausedFrom: null,
    pausedUntil: null,
    pauseCeilingDate: null,
  })
}

export function makeUC(deps: Deps) {
  return async function syncPauseStatuses(
    input: SyncPauseStatusesInput = {}
  ): Promise<SyncPauseStatusesOutput> {
    const { logger, subscriptionPersistor } = deps
    try {
      const now = input.now ?? new Date()
      const asOfDate = input.asOfDate ?? todayKSA(now)

      const candidates =
        await subscriptionPersistor.listSubscriptionsWithPauseWindows()

      let pausedCount = 0
      let completedCount = 0

      for (const sub of candidates) {
        const beforeStatus = sub.status
        const afterStart = await ensurePauseStatus(deps, sub, now)
        if (beforeStatus !== 'paused' && afterStart.status === 'paused') {
          pausedCount += 1
        }

        const afterEnd = await completeEndedPause(deps, afterStart, asOfDate)
        if (afterEnd) {
          completedCount += 1
        }
      }

      logger.log(
        `SyncPauseStatuses: scanned=${candidates.length} paused=${pausedCount} completed=${completedCount} as_of=${asOfDate}`
      )

      return {
        paused_count: pausedCount,
        completed_count: completedCount,
        scanned_count: candidates.length,
        as_of_date: asOfDate,
      }
    } catch (error) {
      logger.error(
        'Failed to sync pause statuses',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SyncPauseStatuses'
