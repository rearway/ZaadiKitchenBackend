import { makeUC } from '../GetBillingTransactions'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetBillingTransactions', () => {
  it('merges wallet, payments, and referrals sorted by created_at desc', async () => {
    const deps = buildDeps({
      walletLoader: {
        ...buildDeps().walletLoader,
        getTransactionsByUserId: jest.fn().mockResolvedValue({
          transactions: [
            {
              id: 'w-1',
              type: 'credit',
              amountSar: 10,
              label: 'Issue credit',
              description: null,
              createdAt: new Date('2025-03-01T12:00:00Z'),
            },
          ],
          total: 1,
        }),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getConfirmedOrdersForBilling: jest.fn().mockResolvedValue({
          orders: [
            {
              orderId: 'o-1',
              planName: 'Month Plan',
              totalPaidSar: 500,
              planPriceSar: 500,
              paymentMethodLabel: 'Visa',
              createdAt: new Date('2025-04-03T12:00:00Z'),
            },
          ],
          total: 1,
        }),
      },
      referralLoader: {
        ...buildDeps().referralLoader,
        getReferralRewardsForBilling: jest.fn().mockResolvedValue({
          rewards: [
            {
              referralId: 'r-1',
              referredUserName: 'Sara',
              rewardCreditedSar: 50,
              referredPlanPriceSar: 500,
              creditedAt: new Date('2025-03-30T12:00:00Z'),
            },
          ],
          total: 1,
        }),
      },
    })
    const getBillingTransactions = makeUC(deps)

    const result = await getBillingTransactions({ userId: 'user-uuid-1' })

    expect(result.transactions.map(t => t.category)).toEqual([
      'subscription_payment',
      'referral_reward',
      'wallet_ledger',
    ])
    expect(result.pagination.total).toBe(3)
  })
})
