import { makeUC } from '../SyncPendingPayments.js'
import {
  buildDeps,
  makeCheckoutSession,
  makeDeliveryDay,
  makeOrder,
  makePaymentMethod,
  makePlan,
  makeSubscription,
} from '../../../../__tests__/helpers/mock-deps.js'

const baseTx = {
  id: 'mock_tx_123',
  userId: 'user-uuid-1',
  checkoutSessionId: 'sess-uuid-1',
  amountSar: 500,
  gatewayPaymentId: 'pay_123',
  startDate: '2025-06-01',
  paymentMethodId: 'pm-uuid-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

function syncDeps(
  txs: Array<Record<string, unknown>>,
  fetchStatus: string,
  overrides: Parameters<typeof buildDeps>[0] = {}
) {
  return buildDeps({
    checkoutSessionLoader: {
      getSessionById: jest.fn().mockResolvedValue(makeCheckoutSession()),
    },
    planLoader: {
      ...buildDeps().planLoader,
      getPlanById: jest.fn().mockResolvedValue(makePlan()),
    },
    paymentMethodLoader: {
      ...buildDeps().paymentMethodLoader,
      getMethodById: jest.fn().mockResolvedValue(makePaymentMethod()),
    },
    orderPersistor: {
      createOrder: jest.fn().mockResolvedValue(makeOrder()),
      updateOrder: jest
        .fn()
        .mockResolvedValue(makeOrder({ subscriptionId: 'sub-uuid-1' })),
    },
    subscriptionPersistor: {
      ...buildDeps().subscriptionPersistor,
      createSubscription: jest.fn().mockResolvedValue(makeSubscription()),
      updateSubscription: jest.fn().mockResolvedValue(makeSubscription()),
    },
    deliveryDayPersistor: {
      ...buildDeps().deliveryDayPersistor,
      bulkCreateDeliveryDays: jest.fn().mockResolvedValue([makeDeliveryDay()]),
    },
    publicHolidayLoader: {
      ...buildDeps().publicHolidayLoader,
      getHolidayDates: jest.fn().mockResolvedValue([]),
    },
    paymentGateway: {
      charge: jest.fn(),
      fetchPayment: jest.fn().mockResolvedValue({
        success: fetchStatus === 'paid' || fetchStatus === 'captured',
        status: fetchStatus,
        gatewayPaymentId: 'pay_123',
        metadata: { startDate: '2025-06-01', paymentMethodId: 'pm-uuid-1' },
      }),
    },
    paymentTransactionLoader: {
      ...buildDeps().paymentTransactionLoader,
      getTransactionsByStatus: jest
        .fn()
        .mockImplementation((status: string) =>
          txs.filter(tx => tx.status === status)
        ),
    },
    ...overrides,
  })
}

describe('SyncPendingPayments', () => {
  it('finishes a paid Moyasar payment that has no subscription', async () => {
    const deps = syncDeps(
      [{ ...baseTx, status: 'INITIATED', gatewayPaymentId: null }],
      'paid'
    )
    const result = await makeUC(deps)({})
    expect(result.syncedCount).toBe(1)
    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalledTimes(
      1
    )
  })

  it('finishes a row already marked paid but unfulfilled', async () => {
    const deps = syncDeps([{ ...baseTx, status: 'PAID_UNFULFILLED' }], 'paid')
    const result = await makeUC(deps)({})
    expect(result.syncedCount).toBe(1)
    expect(deps.paymentGateway.fetchPayment).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalledTimes(
      1
    )
  })

  it('does not fulfill an authorized payment', async () => {
    const deps = syncDeps([{ ...baseTx, status: 'INITIATED' }], 'authorized')
    const result = await makeUC(deps)({})
    expect(result.syncedCount).toBe(0)
    expect(deps.subscriptionPersistor.createSubscription).not.toHaveBeenCalled()
  })
})
