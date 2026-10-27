import {
  currentSubscriptionOrderSql,
  mealsLeftFromCounts,
  pickCurrentSubscription,
} from '../pickCurrentSubscription'

describe('pickCurrentSubscription', () => {
  it('prefers an older in-service row over a newer expired row', () => {
    const picked = pickCurrentSubscription([
      {
        id: 'expired',
        status: 'expired',
        createdAt: new Date('2026-09-01'),
      },
      {
        id: 'active',
        status: 'active',
        createdAt: new Date('2026-05-01'),
      },
    ])

    expect(picked?.id).toBe('active')
  })

  it('picks the newest active, paused, or cancelled row', () => {
    const picked = pickCurrentSubscription([
      {
        id: 'active',
        status: 'active',
        createdAt: new Date('2026-05-01'),
      },
      {
        id: 'paused',
        status: 'paused',
        createdAt: new Date('2026-07-01'),
      },
      {
        id: 'cancelled',
        status: 'cancelled',
        createdAt: new Date('2026-08-01'),
      },
    ])

    expect(picked?.id).toBe('cancelled')
  })

  it('falls back to the newest expired row when none are in service', () => {
    const picked = pickCurrentSubscription([
      {
        id: 'old',
        status: 'expired',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'new',
        status: 'expired',
        createdAt: new Date('2026-06-01'),
      },
    ])

    expect(picked?.id).toBe('new')
  })

  it('counts meal days left without using the calendar', () => {
    expect(mealsLeftFromCounts(22, 4, 1)).toBe(17)
    expect(mealsLeftFromCounts(5, 5, 1)).toBe(0)
  })

  it('orders SQL the same way mobile prefers active, paused, or cancelled', () => {
    expect(currentSubscriptionOrderSql('sub')).toBe(
      "CASE WHEN sub.status IN ('active', 'paused', 'cancelled') THEN 0 ELSE 1 END, sub.created_at DESC"
    )
  })
})
