import {
  buildPauseHomeLabels,
  computePauseDaysFrozen,
  computeSuggestedResumeDate,
} from '../pauseFrozenDays.js'

describe('pauseFrozenDays', () => {
  const windowFrom = '2026-10-12'
  const windowUntil = '2026-10-15'

  it('returns 0 frozen days before pause starts', () => {
    expect(
      computePauseDaysFrozen(windowFrom, windowUntil, '2026-10-10', new Set())
    ).toBe(0)
    const labels = buildPauseHomeLabels(
      windowFrom,
      windowUntil,
      '2026-10-10',
      new Set()
    )
    expect(labels.days_frozen).toBe(0)
    expect(labels.pause_label).toBe('Pause starts 12 Oct')
  })

  it('counts working days in an active pause window', () => {
    expect(
      computePauseDaysFrozen(windowFrom, windowUntil, '2026-10-14', new Set())
    ).toBe(3)
  })

  it('suggested resume is min when tomorrow is before min', () => {
    expect(
      computeSuggestedResumeDate('2026-10-13', '2026-10-15', '2026-10-10')
    ).toBe('2026-10-13')
  })

  it('suggested resume bumps past weekend to Monday when in range', () => {
    expect(
      computeSuggestedResumeDate('2026-10-13', '2026-10-15', '2026-10-10')
    ).toBe('2026-10-13')
  })
})
