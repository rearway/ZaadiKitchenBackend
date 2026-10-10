import type { Subscription } from '../../entities/Subscription.js'
import {
  addDaysUtc,
  isWorkingDayUtc,
  toYYYYMMDD,
} from './deliveryScheduleUtils.js'
import { getFlexDaysRemaining } from './flexDays.js'
import { isPauseScheduled } from './ensurePauseStatus.js'
import { canUseSkipAndPause } from './subscriptionServicePeriod.js'
import { compareDateStrings, isAfterSkipCutoff } from './weekUtils.js'
import { todayKSA } from './revenueUtils.js'

export interface PauseDatePickerBounds {
  visible: boolean
  start_min: string | null
  start_max: string | null
  end_min: string | null
  end_max: string | null
  max_working_days_in_range: number
}

export interface ResumeDatePickerBounds {
  visible: boolean
  min: string | null
  max: string | null
}

export interface PauseResumePickerState {
  pause_date_picker: PauseDatePickerBounds
  resume_date_picker: ResumeDatePickerBounds
  cancel_pause_available: boolean
}

/** Last calendar date reachable by walking `workingDayCount` working days forward from `from` (inclusive start). */
export function addWorkingDaysForward(
  from: string,
  workingDayCount: number,
  holidaySet: Set<string> = new Set()
): string {
  if (workingDayCount <= 0) {
    return from
  }
  let remaining = workingDayCount
  let cursor = new Date(from + 'T00:00:00Z')
  let iterations = 0
  while (remaining > 0 && iterations++ < 500) {
    const dateStr = toYYYYMMDD(cursor)
    if (isWorkingDayUtc(cursor) && !holidaySet.has(dateStr)) {
      remaining -= 1
      if (remaining === 0) {
        return dateStr
      }
    }
    cursor = addDaysUtc(cursor, 1)
  }
  return toYYYYMMDD(cursor)
}

export function nextCalendarDay(dateStr: string): string {
  return toYYYYMMDD(addDaysUtc(new Date(dateStr + 'T00:00:00Z'), 1))
}

function computePauseEndMax(planEnd: string, flexRemaining: number, holidays: Set<string>): string {
  return addWorkingDaysForward(planEnd, flexRemaining, holidays)
}

function computePauseStartMin(
  planStart: string,
  pauseEndMax: string,
  now: Date
): string | null {
  const today = todayKSA()
  let candidate = compareDateStrings(planStart, today) > 0 ? planStart : today
  let guard = 0
  while (
    guard++ < 400 &&
    compareDateStrings(candidate, pauseEndMax) <= 0 &&
    isAfterSkipCutoff(candidate, now)
  ) {
    candidate = nextCalendarDay(candidate)
  }
  if (compareDateStrings(candidate, pauseEndMax) > 0) {
    return null
  }
  return candidate
}

/** Pause window has begun (cutoff passed for paused_from). */
export function hasPauseStarted(
  pausedFrom: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!pausedFrom) return false
  return isAfterSkipCutoff(pausedFrom, now)
}

export function buildPauseResumePickerState(
  subscription: Subscription,
  holidaySet: Set<string>,
  now: Date = new Date()
): PauseResumePickerState {
  const flexRemaining = getFlexDaysRemaining(subscription)
  const pauseScheduled = isPauseScheduled(subscription, now)
  const pausedFrom = subscription.pausedFrom
  const pausedUntil = subscription.pausedUntil
  const hasWindow = !!(pausedFrom && pausedUntil)
  const pauseStarted = hasPauseStarted(pausedFrom, now)
  const canSchedule =
    canUseSkipAndPause(subscription) &&
    flexRemaining > 0 &&
    !hasWindow

  const pauseEndMax =
    flexRemaining > 0
      ? computePauseEndMax(subscription.endDate, flexRemaining, holidaySet)
      : subscription.endDate

  const startMin = canSchedule
    ? computePauseStartMin(subscription.startDate, pauseEndMax, now)
    : null

  const pauseVisible = canSchedule && startMin != null

  const resumeVisible =
    hasWindow &&
    pauseStarted &&
    !isAfterSkipCutoff(pausedUntil!, now) &&
    (subscription.status === 'paused' ||
      subscription.status === 'active' ||
      subscription.status === 'cancelled')

  let resumeMin: string | null = null
  let resumeMax: string | null = null
  if (resumeVisible && pausedFrom && pausedUntil) {
    resumeMin = nextCalendarDay(pausedFrom)
    resumeMax = pausedUntil
    if (compareDateStrings(resumeMin, resumeMax) > 0) {
      resumeMin = null
      resumeMax = null
    }
  }

  return {
    pause_date_picker: {
      visible: pauseVisible,
      start_min: pauseVisible ? startMin : null,
      start_max: pauseVisible ? pauseEndMax : null,
      end_min: pauseVisible ? startMin : null,
      end_max: pauseVisible ? pauseEndMax : null,
      max_working_days_in_range: flexRemaining,
    },
    resume_date_picker: {
      visible: resumeVisible && resumeMin != null && resumeMax != null,
      min: resumeVisible && resumeMin != null ? resumeMin : null,
      max: resumeVisible && resumeMax != null ? resumeMax : null,
    },
    cancel_pause_available: pauseScheduled,
  }
}
