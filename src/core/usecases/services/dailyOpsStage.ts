import type { DailyOpsDay } from '../../entities/DailyOpsDay.js'
import { isAfterSkipCutoff } from './weekUtils.js'

export type PipelineStage = 'pending' | 'locked' | 'dispatch' | 'delivered'

export const MANUAL_STAGE_ORDER: PipelineStage[] = ['locked', 'dispatch', 'delivered']

/**
 * The pipeline stage is derived, not stored, for 'pending'/'locked' — it only
 * becomes persisted state once a manual advance (dispatch/delivered) happens.
 */
export function computeEffectiveStage(day: DailyOpsDay | null, date: string): PipelineStage {
  if (day?.deliveredAt) return 'delivered'
  if (day?.dispatchedAt) return 'dispatch'
  if (isAfterSkipCutoff(date)) return 'locked'
  return 'pending'
}

export function nextStage(stage: PipelineStage): PipelineStage | null {
  const index = MANUAL_STAGE_ORDER.indexOf(stage)
  if (index === -1 || index === MANUAL_STAGE_ORDER.length - 1) return null
  return MANUAL_STAGE_ORDER[index + 1]
}
