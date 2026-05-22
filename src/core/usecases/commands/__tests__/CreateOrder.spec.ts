import { makeUC } from '../CreateOrder'
import {
  buildDeps,
  makeCheckoutSession,
  makePaymentMethod,
  makePlan,
  makeOrder,
  makeSubscription,
  makeDeliveryDay,
  makePromoCode,
} from '../../../../__tests__/helpers/mock-deps'

describe('CreateOrder', () => {
  const validInput = {
    userId: 'user-uuid-1',
    sessionId: 'sess-uuid-1',
    paymentMethodId: 'pm-uuid-1',
    startDate: '2025-06-01',
  }

  function makeOrderDeps(overrides: Parameters<typeof buildDeps>[0] = {}) {
    const session = makeCheckoutSession({
      planId: 'plan-uuid-month',
      mealType: 'executive',
      basePriceSar: 500,
      walletCreditSar: 0,
      promoDiscountSar: 0,
      totalDueSar: 500,
    })
    const paymentMethod = makePaymentMethod({ userId: 'user-uuid-1' })
    const plan = makePlan()
    const order = makeOrder()
    const subscription = makeSubscription()
    const deliveryDays = Array.from({ length: 22 }, (_, i) => makeDeliveryDay({ id: `dd-${i}`, date: `2025-06-${String(i + 1).padStart(2, '0')}` }))

    return buildDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      paymentMethodLoader: {
        ...buildDeps().paymentMethodLoader,
        getMethodById: jest.fn().mockResolvedValue(paymentMethod),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
      orderPersistor: {
        createOrder: jest.fn().mockResolvedValue(order),
        updateOrder: jest.fn().mockResolvedValue({ ...order, subscriptionId: subscription.id }),
      },
      subscriptionPersistor: {
        createSubscription: jest.fn().mockResolvedValue(subscription),
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
      deliveryDayPersistor: {
        ...buildDeps().deliveryDayPersistor,
        bulkCreateDeliveryDays: jest.fn().mockResolvedValue(deliveryDays),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({ ...makeCheckoutSession(), status: 'confirmed' }),
        expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
      },
      paymentMethodPersistor: {
        ...buildDeps().paymentMethodPersistor,
        markAsLastUsed: jest.fn().mockResolvedValue(undefined),
      },
      publicHolidayLoader: {
        ...buildDeps().publicHolidayLoader,
        getHolidayDates: jest.fn().mockResolvedValue([]),
      },
      paymentGateway: {
        charge: jest.fn().mockResolvedValue({ success: true, gatewayPaymentId: 'mock_pay_123' }),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(null),
      },
      walletPersistor: {
        createTransaction: jest.fn().mockResolvedValue(undefined),
      },
      referralPersistor: {
        createReferral: jest.fn().mockResolvedValue(undefined),
      },
      ...overrides,
    })
  }

  it('creates an order, subscription, and delivery days for a new user', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    const result = await createOrder(validInput)

    expect(result.order_id).toBeTruthy()
    expect(result.subscription_id).toBeTruthy()
    expect(result.status).toBe('confirmed')
    expect(result.is_new_user).toBe(true)
    expect(result.meal_type).toBe('executive')
    expect(result.start_date).toBe('2025-06-01')
    expect(result.summary.total_paid_sar).toBe(500)
  })

  it('charges the payment gateway before creating the order', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.paymentGateway.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        amountSar: 500,
        paymentToken: 'tok_test_xxxx',
      })
    )
    const chargeOrder = (deps.paymentGateway.charge as jest.Mock).mock.invocationCallOrder[0]
    const createOrderCall = (deps.orderPersistor.createOrder as jest.Mock).mock.invocationCallOrder[0]
    expect(chargeOrder).toBeLessThan(createOrderCall)
  })

  it('marks the session as confirmed after successful order', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.checkoutSessionPersistor.updateSession).toHaveBeenCalledWith(
      validInput.sessionId,
      expect.objectContaining({ status: 'confirmed' })
    )
  })

  it('marks the payment method as last used', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.paymentMethodPersistor.markAsLastUsed).toHaveBeenCalledWith(
      validInput.paymentMethodId,
      validInput.userId
    )
  })

  it('debits the wallet when walletCreditSar > 0', async () => {
    const session = makeCheckoutSession({ walletCreditSar: 50, totalDueSar: 450 })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
    })
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.walletPersistor.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: validInput.userId,
        type: 'debit',
        amountSar: -50,
      })
    )
  })

  it('does not create a wallet transaction when walletCreditSar is 0', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.walletPersistor.createTransaction).not.toHaveBeenCalled()
  })

  it('credits the referrer wallet 10% of plan price when a referral code was applied', async () => {
    const referralPromo = makePromoCode({ type: 'referral', ownerUserId: 'referrer-uuid-1', discountSar: 100 })
    const session = makeCheckoutSession({ promoCode: 'TESTREF10' })
    const deps = makeOrderDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(referralPromo) },
    })
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.walletPersistor.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'referrer-uuid-1',
        type: 'credit',
        amountSar: 50, // 10% of 500
      })
    )
    expect(deps.referralPersistor.createReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        referrerUserId: 'referrer-uuid-1',
        referredUserId: validInput.userId,
        referralCode: 'TESTREF10',
        isRewarded: true,
      })
    )
  })

  it('sets is_new_user=false when the user has a previous order', async () => {
    const prevOrder = makeOrder({ isNewUser: false })
    const deps = makeOrderDeps({
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(prevOrder),
      },
    })
    const createOrder = makeUC(deps)

    const result = await createOrder(validInput)
    expect(result.is_new_user).toBe(false)
  })

  it('throws SessionExpiredError when the session has expired', async () => {
    const expiredSession = makeCheckoutSession({
      expiresAt: new Date(Date.now() - 1000),
    })
    const deps = makeOrderDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(expiredSession) },
    })
    const createOrder = makeUC(deps)

    await expect(createOrder(validInput)).rejects.toMatchObject({
      errorCode: 'SESSION_EXPIRED',
      statusCode: 410,
    })
    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
  })

  it('throws SessionExpiredError when the session status is expired', async () => {
    const expiredSession = makeCheckoutSession({ status: 'expired' })
    const deps = makeOrderDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(expiredSession) },
    })
    const createOrder = makeUC(deps)

    await expect(createOrder(validInput)).rejects.toMatchObject({
      errorCode: 'SESSION_EXPIRED',
      statusCode: 410,
    })
  })

  it('throws ResourceNotFoundError when the payment method does not belong to the user', async () => {
    const otherUsersMethod = makePaymentMethod({ userId: 'different-user-uuid' })
    const deps = makeOrderDeps({
      paymentMethodLoader: {
        ...buildDeps().paymentMethodLoader,
        getMethodById: jest.fn().mockResolvedValue(otherUsersMethod),
      },
    })
    const createOrder = makeUC(deps)

    await expect(createOrder(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
  })

  it('throws ResourceNotFoundError when the payment method ID is invalid', async () => {
    const deps = makeOrderDeps({
      paymentMethodLoader: {
        ...buildDeps().paymentMethodLoader,
        getMethodById: jest.fn().mockResolvedValue(null),
      },
    })
    const createOrder = makeUC(deps)

    await expect(createOrder(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws PaymentFailedError when the gateway declines the charge', async () => {
    const deps = makeOrderDeps({
      paymentGateway: {
        charge: jest.fn().mockResolvedValue({
          success: false,
          gatewayPaymentId: '',
          errorMessage: 'Insufficient funds',
        }),
      },
    })
    const createOrder = makeUC(deps)

    await expect(createOrder(validInput)).rejects.toMatchObject({
      errorCode: 'PAYMENT_FAILED',
      statusCode: 402,
    })
    expect(deps.orderPersistor.createOrder).not.toHaveBeenCalled()
  })

  it('generates delivery days excluding weekends (Fri/Sat)', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    await createOrder({ ...validInput, startDate: '2025-06-01' })

    const bulkCreateCall = (deps.deliveryDayPersistor.bulkCreateDeliveryDays as jest.Mock).mock.calls[0][0]
    const dayOfWeeks = bulkCreateCall.map((d: { date: string }) => new Date(d.date + 'T00:00:00Z').getDay())
    // Day 5 = Friday, Day 6 = Saturday
    expect(dayOfWeeks).not.toContain(5)
    expect(dayOfWeeks).not.toContain(6)
  })

  it('skips public holidays when generating delivery days', async () => {
    const holiday = '2025-06-04' // Wednesday — a public holiday
    const deps = makeOrderDeps({
      publicHolidayLoader: {
        ...buildDeps().publicHolidayLoader,
        getHolidayDates: jest.fn().mockResolvedValue([holiday]),
      },
    })
    const createOrder = makeUC(deps)

    await createOrder({ ...validInput, startDate: '2025-06-01' })

    const bulkCreateCall = (deps.deliveryDayPersistor.bulkCreateDeliveryDays as jest.Mock).mock.calls[0][0]
    const dates = bulkCreateCall.map((d: { date: string }) => d.date)
    expect(dates).not.toContain(holiday)
  })

  it('links the order and subscription to each other', async () => {
    const deps = makeOrderDeps()
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: expect.any(String) })
    )
    expect(deps.orderPersistor.updateOrder).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ subscriptionId: expect.any(String) })
    )
  })
})
