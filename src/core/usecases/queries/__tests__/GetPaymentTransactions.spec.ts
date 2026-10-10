import { makeUC } from '../GetPaymentTransactions'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetPaymentTransactions', () => {
  it('returns confirmed orders as subscription_payment debits', async () => {
    const createdAt = new Date('2025-04-03T12:00:00Z')
    const deps = buildDeps({
      orderLoader: {
        ...buildDeps().orderLoader,
        getConfirmedOrdersForBilling: jest.fn().mockResolvedValue({
          orders: [
            {
              orderId: 'order-1',
              planName: 'Month Plan',
              totalPaidSar: 500,
              planPriceSar: 500,
              paymentMethodLabel: 'Visa ·4242',
              createdAt,
            },
          ],
          total: 1,
        }),
      },
    })
    const getPaymentTransactions = makeUC(deps)

    const result = await getPaymentTransactions({ userId: 'user-uuid-1' })

    expect(result.transactions[0]).toMatchObject({
      id: 'order-1',
      category: 'subscription_payment',
      type: 'debit',
      amount_sar: 500,
      label: 'Month Plan · Apr 2025',
      description: 'Apr 3, 2025',
      payment_method_label: 'Visa ·4242',
    })
    expect(result.pagination.total).toBe(1)
  })
})
