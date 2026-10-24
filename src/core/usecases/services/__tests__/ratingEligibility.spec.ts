import { isDeliveryEligibleForRating } from '../ratingEligibility.js'

describe('isDeliveryEligibleForRating', () => {
  it('keeps a rider-delivered meal eligible after the ops day is closed', () => {
    expect(isDeliveryEligibleForRating('delivered', true)).toBe(true)
    expect(isDeliveryEligibleForRating('delivered', false)).toBe(true)
  })

  it('treats an ops-closed day as delivered for stops still on the run', () => {
    expect(isDeliveryEligibleForRating('scheduled', true)).toBe(true)
    expect(isDeliveryEligibleForRating('past_cutoff', true)).toBe(true)
  })

  it('does not treat dispatch, lock, or an open day as delivered', () => {
    expect(isDeliveryEligibleForRating('scheduled', false)).toBe(false)
    expect(isDeliveryEligibleForRating('past_cutoff', false)).toBe(false)
  })

  it('does not rate skipped or paused stops when the ops day is closed', () => {
    expect(isDeliveryEligibleForRating('skipped', true)).toBe(false)
    expect(isDeliveryEligibleForRating('paused', true)).toBe(false)
  })
})
