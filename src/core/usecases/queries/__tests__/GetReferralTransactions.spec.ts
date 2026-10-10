import { makeUC } from '../GetReferralTransactions'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetReferralTransactions', () => {
  it('returns referral rewards as credit transactions', async () => {
    const creditedAt = new Date('2025-03-30T12:00:00Z')
    const deps = buildDeps({
      referralLoader: {
        ...buildDeps().referralLoader,
        getReferralRewardsForBilling: jest.fn().mockResolvedValue({
          rewards: [
            {
              referralId: 'ref-1',
              referredUserName: 'Sara',
              rewardCreditedSar: 50,
              referredPlanPriceSar: 500,
              creditedAt,
            },
          ],
          total: 1,
        }),
      },
    })
    const getReferralTransactions = makeUC(deps)

    const result = await getReferralTransactions({ userId: 'user-uuid-1' })

    expect(result.transactions[0]).toMatchObject({
      id: 'ref-1',
      category: 'referral_reward',
      type: 'credit',
      amount_sar: 50,
      label: 'Referral reward — Sara',
      description: 'Mar 30, 2025 · 10% of SAR 500',
    })
  })
})
