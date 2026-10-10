import { makeSubscription } from '../../../../__tests__/helpers/mock-deps'
import {
  addWorkingDaysForward,
  buildPauseResumePickerState,
  nextCalendarDay,
} from '../pauseResumeDatePicker.js'

describe('pauseResumeDatePicker', () => {
  const FROZEN = new Date('2026-06-01T10:00:00Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('addWorkingDaysForward walks working days only', () => {
    const end = addWorkingDaysForward('2026-06-04', 2, new Set())
    expect(end).toBe('2026-06-07')
  })

  it('exposes pause picker when active with flex remaining', () => {
    const sub = makeSubscription({
      status: 'active',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      skipDaysUsed: 0,
      pauseDaysUsed: 0,
    })
    const state = buildPauseResumePickerState(sub, new Set(), FROZEN)
    expect(state.pause_date_picker.visible).toBe(true)
    expect(state.pause_date_picker.start_min).toBe('2026-06-02')
    expect(state.pause_date_picker.max_working_days_in_range).toBe(66)
    expect(state.resume_date_picker.visible).toBe(false)
    expect(state.cancel_pause_available).toBe(false)
  })

  it('exposes cancel_pause when pause is scheduled in the future', () => {
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: '2026-06-10',
      pausedUntil: '2026-06-14',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    })
    const state = buildPauseResumePickerState(sub, new Set(), FROZEN)
    expect(state.pause_date_picker.visible).toBe(false)
    expect(state.cancel_pause_available).toBe(true)
  })

  it('hides resume picker before pause-start cutoff when status is active', () => {
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: '2026-06-10',
      pausedUntil: '2026-06-14',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    })
    const state = buildPauseResumePickerState(sub, new Set(), FROZEN)
    expect(state.resume_date_picker.visible).toBe(false)
    expect(state.cancel_pause_available).toBe(true)
  })

  it('exposes resume picker after pause-start cutoff', () => {
    const afterPauseStart = new Date('2026-06-03T10:00:00Z')
    jest.setSystemTime(afterPauseStart)
    const sub = makeSubscription({
      status: 'paused',
      pausedFrom: '2026-06-02',
      pausedUntil: '2026-06-10',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    })
    const state = buildPauseResumePickerState(sub, new Set(), afterPauseStart)
    expect(state.resume_date_picker.visible).toBe(true)
    expect(state.resume_date_picker.min).toBe(nextCalendarDay('2026-06-02'))
    expect(state.resume_date_picker.max).toBe('2026-06-10')
    expect(state.resume_date_picker.suggested_date).toBe('2026-06-04')
  })
})
