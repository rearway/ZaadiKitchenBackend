import { makeUC } from '../GetReferral'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetReferral', () => {
  it('shares a 15% friend discount and a 10% referrer reward', async () => {
    const deps = buildDeps({
      referralLoader: {
        ...buildDeps().referralLoader,
        getReferralStatsByUserId: jest.fn().mockResolvedValue({
          referralCode: 'QAREF6964',
          friendsJoined: 0,
          totalEarnedSar: 0,
        }),
        getReferralHistory: jest.fn().mockResolvedValue([]),
      },
    })
    const getReferral = makeUC(deps)

    const result = await getReferral({ userId: 'user-uuid-1' })

    expect(result.referral_code).toBe('QAREF6964')
    expect(result.reward_rate_pct).toBe(10)
    expect(result.whatsapp_share_text).toContain('QAREF6964')
    expect(result.whatsapp_share_text).toContain('15% off')
    expect(result.whatsapp_share_text).not.toContain('20%')
  })
})
