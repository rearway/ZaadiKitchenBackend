import { makeUC } from '../HandleMoyasarWebhook.js'
import {
  buildDeps,
  makeCheckoutSession,
  makeDeliveryDay,
  makeOrder,
  makePaymentMethod,
  makePlan,
  makeSubscription,
} from '../../../../__tests__/helpers/mock-deps.js'

const tx = {
  id: 'mock_tx_123',
  userId: 'user-uuid-1',
  checkoutSessionId: 'sess-uuid-1',
  amountSar: 500,
  status: 'INITIATED' as const,
  gatewayPaymentId: null,
  startDate: '2025-06-01',
  paymentMethodId: 'pm-uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

function paidPayload(type = 'payment_paid', status = 'paid') {
  return {
    id: 'evt-1',
    type,
    secret_token: 'whsec_test',
    data: {
      id: 'pay_123',
      status,
      metadata: {
        orderId: tx.id,
        startDate: tx.startDate,
        paymentMethodId: tx.paymentMethodId,
      },
    },
  }
}

function webhookDeps(overrides: Parameters<typeof buildDeps>[0] = {}) {
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
      createOrder: jest
        .fn()
        .mockResolvedValue(makeOrder({ gatewayPaymentId: 'pay_123' })),
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
    paymentTransactionLoader: {
      ...buildDeps().paymentTransactionLoader,
      getTransactionById: jest.fn().mockResolvedValue(tx),
    },
    ...overrides,
  })
}

describe('HandleMoyasarWebhook', () => {
  it('rejects a missing or wrong secret', async () => {
    const deps = webhookDeps()
    await expect(
      makeUC(deps)({ payload: { ...paidPayload(), secret_token: 'nope' } })
    ).rejects.toMatchObject({ statusCode: 401 })
    expect(deps.subscriptionPersistor.createSubscription).not.toHaveBeenCalled()
  })

  it('activates the subscription on a verified payment_paid event', async () => {
    const deps = webhookDeps()
    const result = await makeUC(deps)({ payload: paidPayload() })
    expect(result).toEqual({ received: true })
    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalledTimes(
      1
    )
    expect(
      deps.paymentTransactionPersistor.updateTransaction
    ).toHaveBeenCalledWith(
      tx.id,
      expect.objectContaining({ status: 'SUCCESS' })
    )
  })

  it('does not activate a subscription for an authorized event', async () => {
    const deps = webhookDeps()
    const result = await makeUC(deps)({
      payload: paidPayload('payment_authorized', 'authorized'),
    })
    expect(result).toEqual({ received: true })
    expect(deps.subscriptionPersistor.createSubscription).not.toHaveBeenCalled()
  })

  it('is idempotent when the same paid event is delivered twice', async () => {
    let locked = false
    const deps = webhookDeps({
      paymentTransactionPersistor: {
        ...buildDeps().paymentTransactionPersistor,
        compareAndSetStatus: jest.fn().mockImplementation(() => {
          if (locked) return false
          locked = true
          return true
        }),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getOrderByGatewayPaymentId: jest.fn().mockImplementation(() =>
          locked
            ? makeOrder({
                subscriptionId: 'sub-uuid-1',
                gatewayPaymentId: 'pay_123',
              })
            : null
        ),
      },
    })

    const handle = makeUC(deps)
    await handle({ payload: paidPayload() })
    await handle({ payload: paidPayload('payment_captured', 'captured') })

    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalledTimes(
      1
    )
  })
})
