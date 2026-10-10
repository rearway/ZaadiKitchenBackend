import { makeSubscription } from '../../../../__tests__/helpers/mock-deps'
import {
  canUseSkipAndPause,
  isSubscriptionInServicePeriod,
} from '../subscriptionServicePeriod.js'

describe('subscriptionServicePeriod', () => {
  it('treats cancelled in-cycle as in service', () => {
    const sub = makeSubscription({
      status: 'cancelled',
      endDate: '2099-12-31',
    })
    expect(isSubscriptionInServicePeriod(sub, '2026-06-01')).toBe(true)
    expect(canUseSkipAndPause(sub, '2026-06-01')).toBe(true)
  })

  it('treats cancelled past end as out of service', () => {
    const sub = makeSubscription({
      status: 'cancelled',
      endDate: '2020-01-01',
    })
    expect(isSubscriptionInServicePeriod(sub, '2026-06-01')).toBe(false)
    expect(canUseSkipAndPause(sub, '2026-06-01')).toBe(false)
  })
})
