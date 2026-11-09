import { DEFAULT_APP_LABELS, parseAppLabels } from '../app-labels.js'

describe('parseAppLabels', () => {
  it('returns defaults when value is missing', () => {
    expect(parseAppLabels(null)).toEqual(DEFAULT_APP_LABELS)
  })

  it('keeps default keys when DB omits a group', () => {
    const parsed = parseAppLabels({ plans: [] })
    expect(parsed.plans).toEqual(DEFAULT_APP_LABELS.plans)
    expect(parsed.wallet).toEqual(DEFAULT_APP_LABELS.wallet)
  })
})
