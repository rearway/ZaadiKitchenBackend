import { SubscriptionPersistenceService } from '../subscription-persistence.service'
import { DeliveryDayModel } from '../models/DeliveryDayModel'

describe('getRiderDeliveriesByDate assigned-area guard', () => {
  it('returns no rows when the assigned area list is empty, without querying', async () => {
    const service = new SubscriptionPersistenceService()

    await expect(
      service.getRiderDeliveriesByDate('2026-08-02', undefined, [])
    ).resolves.toEqual([])
  })

  it('excludes soft-deleted delivery areas from the rider area lookup', async () => {
    const query = jest.fn<Promise<unknown[]>, [string]>().mockResolvedValue([])
    Object.defineProperty(DeliveryDayModel, 'sequelize', {
      configurable: true,
      get: () => ({ query }),
    })
    const service = new SubscriptionPersistenceService()

    await service.getRiderDeliveriesByDate('2026-10-25')

    expect(query.mock.calls[0][0]).toContain('da.deleted_at IS NULL')
    delete (DeliveryDayModel as { sequelize?: unknown }).sequelize
  })
})
