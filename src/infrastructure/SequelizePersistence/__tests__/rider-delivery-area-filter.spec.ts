import { SubscriptionPersistenceService } from '../subscription-persistence.service'

describe('getRiderDeliveriesByDate assigned-area guard', () => {
  it('returns no rows when the assigned area list is empty, without querying', async () => {
    const service = new SubscriptionPersistenceService()

    await expect(
      service.getRiderDeliveriesByDate('2026-08-02', undefined, [])
    ).resolves.toEqual([])
  })
})
