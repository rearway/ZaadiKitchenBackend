import { QueryTypes } from 'sequelize'

import { SubscriptionPersistenceService } from '../subscription-persistence.service.js'
import { DeliveryDayModel } from '../models/index.js'

describe('daily ops deliverable day SQL guard', () => {
  const query = jest.fn<
    Promise<unknown[]>,
    [string, { type?: unknown; replacements?: unknown }?]
  >()

  beforeEach(() => {
    query.mockReset()
    query.mockResolvedValue([])
    Object.defineProperty(DeliveryDayModel, 'sequelize', {
      configurable: true,
      get: () => ({ query }),
    })
  })

  afterEach(() => {
    delete (DeliveryDayModel as { sequelize?: unknown }).sequelize
  })

  it('excludes subscription pause windows from rider deliveries', async () => {
    const service = new SubscriptionPersistenceService()
    await service.getRiderDeliveriesByDate('2026-10-26')

    const sql = query.mock.calls[0][0] as string
    expect(sql).toContain('s.paused_from IS NOT NULL')
    expect(sql).toContain('dd.date >= s.paused_from')
    expect(sql).toContain('dd.date <= s.paused_until')
    expect(query.mock.calls[0][1]).toMatchObject({
      type: QueryTypes.SELECT,
      replacements: { date: '2026-10-26' },
    })
  })

  it('applies the same guard to meal breakdown counts', async () => {
    const service = new SubscriptionPersistenceService()
    await service.getMealBreakdownByDate('2026-10-26')

    const sql = query.mock.calls[0][0] as string
    expect(sql).toContain('s.paused_from IS NOT NULL')
    expect(sql).toContain('dd.date <= s.paused_until')
  })
})
