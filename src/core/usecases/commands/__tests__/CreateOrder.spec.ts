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
    const deliveryDays = Array.from({ length: 22 }, (_, i) =>
      makeDeliveryDay({
        id: `dd-${i}`,
        date: `2025-06-${String(i + 1).padStart(2, '0')}`,
      })
    )

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
        updateOrder: jest
          .fn()
          .mockResolvedValue({ ...order, subscriptionId: subscription.id }),
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
        updateSession: jest
          .fn()
          .mockResolvedValue({ ...makeCheckoutSession(), status: 'confirmed' }),
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
        charge: jest.fn().mockResolvedValue({
          success: true,
          gatewayPaymentId: 'mock_pay_123',
        }),
        fetchPayment: jest.fn().mockResolvedValue({
          success: false,
          status: 'not_found',
          gatewayPaymentId: '',
        }),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(null),
      },
      walletPersistor: {
        createTransaction: jest.fn().mockResolvedValue(undefined),
        createDebitIfSufficient: jest.fn().mockResolvedValue(undefined),
      },
      walletLoader: {
        getBalanceByUserId: jest.fn().mockResolvedValue(0),
      },
      referralPersistor: {
        createReferral: jest.fn().mockResolvedValue(undefined),
        markRewarded: jest.fn().mockResolvedValue(undefined),
      },
      userDeviceLoader: {
        getDevicesByUserId: jest.fn().mockResolvedValue([]),
      },
      notificationGateway: {
        sendSingleNotification: jest.fn().mockResolvedValue(undefined),
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
        idempotencyKey: 'mock_tx_123',
        orderId: 'mock_tx_123',
      })
    )
    const chargeOrder = (deps.paymentGateway.charge as jest.Mock).mock
      .invocationCallOrder[0]
    const createOrderCall = (deps.orderPersistor.createOrder as jest.Mock).mock
      .invocationCallOrder[0]
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
    const session = makeCheckoutSession({
      walletCreditSar: 50,
      totalDueSar: 450,
    })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: {
        getBalanceByUserId: jest.fn().mockResolvedValue(50),
      },
    })
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.walletPersistor.createDebitIfSufficient).toHaveBeenCalledWith(
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
    const referralPromo = makePromoCode({
      type: 'referral',
      ownerUserId: 'referrer-uuid-1',
      discountSar: 100,
    })
    const session = makeCheckoutSession({ promoCode: 'TESTREF10' })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(referralPromo),
      },
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
        rewardCreditedSar: 50,
        isRewarded: true,
      })
    )
  })

  it('does not credit the referrer when the buyer is not on their first plan', async () => {
    const referralPromo = makePromoCode({
      type: 'referral',
      ownerUserId: 'referrer-uuid-1',
    })
    const session = makeCheckoutSession({ promoCode: 'TESTREF10' })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(referralPromo),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(makeOrder()),
      },
    })
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.walletPersistor.createTransaction).not.toHaveBeenCalled()
    expect(deps.referralPersistor.createReferral).not.toHaveBeenCalled()
  })

  it('does not credit a wallet when the buyer uses their own referral code', async () => {
    const referralPromo = makePromoCode({
      type: 'referral',
      ownerUserId: validInput.userId,
    })
    const session = makeCheckoutSession({ promoCode: 'TESTREF10' })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(referralPromo),
      },
    })
    const createOrder = makeUC(deps)

    await createOrder(validInput)

    expect(deps.walletPersistor.createTransaction).not.toHaveBeenCalled()
    expect(deps.referralPersistor.createReferral).not.toHaveBeenCalled()
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
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(expiredSession),
      },
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
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(expiredSession),
      },
    })
    const createOrder = makeUC(deps)

    await expect(createOrder(validInput)).rejects.toMatchObject({
      errorCode: 'SESSION_EXPIRED',
      statusCode: 410,
    })
  })

  it('throws ResourceNotFoundError when the payment method does not belong to the user', async () => {
    const otherUsersMethod = makePaymentMethod({
      userId: 'different-user-uuid',
    })
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

    const bulkCreateCall = (
      deps.deliveryDayPersistor.bulkCreateDeliveryDays as jest.Mock
    ).mock.calls[0][0]
    const dayOfWeeks = bulkCreateCall.map((d: { date: string }) =>
      new Date(d.date + 'T00:00:00Z').getDay()
    )
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

    const bulkCreateCall = (
      deps.deliveryDayPersistor.bulkCreateDeliveryDays as jest.Mock
    ).mock.calls[0][0]
    const dates = bulkCreateCall.map((d: { date: string }) => d.date)
    expect(dates).not.toContain(holiday)
  })

  describe('duplicate subscription protection', () => {
    it('rejects a session that was already paid without charging again', async () => {
      const deps = makeOrderDeps({
        checkoutSessionLoader: {
          getSessionById: jest
            .fn()
            .mockResolvedValue(makeCheckoutSession({ status: 'confirmed' })),
        },
      })

      await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
        errorCode: 'CHECKOUT_ALREADY_COMPLETED',
        statusCode: 409,
      })
      expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
      expect(
        deps.subscriptionPersistor.createSubscription
      ).not.toHaveBeenCalled()
    })

    it('rejects a concurrent second submit when the session claim fails', async () => {
      const deps = makeOrderDeps({
        checkoutSessionPersistor: {
          ...buildDeps().checkoutSessionPersistor,
          claimSession: jest.fn().mockResolvedValue(false),
        },
      })

      await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
        errorCode: 'CHECKOUT_ALREADY_COMPLETED',
      })
      expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
      expect(
        deps.deliveryDayPersistor.bulkCreateDeliveryDays
      ).not.toHaveBeenCalled()
    })

    it('claims the session before charging', async () => {
      const deps = makeOrderDeps()

      await makeUC(deps)(validInput)

      const claim = (deps.checkoutSessionPersistor.claimSession as jest.Mock)
        .mock.invocationCallOrder[0]
      const charge = (deps.paymentGateway.charge as jest.Mock).mock
        .invocationCallOrder[0]
      expect(deps.checkoutSessionPersistor.claimSession).toHaveBeenCalledWith(
        validInput.sessionId
      )
      expect(claim).toBeLessThan(charge)
    })

    it.each(['active', 'paused', 'cancelled'] as const)(
      'rejects a new purchase when the user already has a %s subscription',
      async status => {
        const deps = makeOrderDeps({
          subscriptionLoader: {
            ...buildDeps().subscriptionLoader,
            getActiveSubscriptionByUserId: jest
              .fn()
              .mockResolvedValue(makeSubscription({ status })),
          },
        })

        await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
          errorCode: 'ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED',
        })
        expect(
          deps.checkoutSessionPersistor.claimSession
        ).not.toHaveBeenCalled()
        expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
        expect(
          deps.subscriptionPersistor.createSubscription
        ).not.toHaveBeenCalled()
      }
    )

    it('rejects an upgrade when the live subscription is no longer the one being upgraded', async () => {
      const deps = makeOrderDeps({
        checkoutSessionLoader: {
          getSessionById: jest
            .fn()
            .mockResolvedValue(
              makeCheckoutSession({ promotionSubscriptionId: 'sub-old' })
            ),
        },
        subscriptionLoader: {
          ...buildDeps().subscriptionLoader,
          getActiveSubscriptionByUserId: jest
            .fn()
            .mockResolvedValue(
              makeSubscription({ id: 'sub-other', status: 'active' })
            ),
        },
      })

      await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
        errorCode: 'ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED',
      })
      expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    })

    it("rejects another user's session", async () => {
      const deps = makeOrderDeps({
        checkoutSessionLoader: {
          getSessionById: jest
            .fn()
            .mockResolvedValue(makeCheckoutSession({ userId: 'someone-else' })),
        },
      })

      await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
        errorCode: 'SESSION_EXPIRED',
      })
      expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    })

    it('releases the session when the charge is declined so the user can retry', async () => {
      const deps = makeOrderDeps({
        paymentGateway: {
          charge: jest.fn().mockResolvedValue({
            success: false,
            gatewayPaymentId: '',
            errorMessage: 'Declined',
          }),
        },
      })

      await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
        errorCode: 'PAYMENT_FAILED',
      })
      expect(deps.checkoutSessionPersistor.updateSession).toHaveBeenCalledWith(
        validInput.sessionId,
        { status: 'active' }
      )
    })
  })

  it('charges a saved card for the remainder when the client sends a placeholder method id', async () => {
    const session = makeCheckoutSession({
      planId: 'plan-week',
      basePriceSar: 125,
      walletCreditSar: 29,
      totalDueSar: 96,
    })
    const saved = makePaymentMethod({
      id: 'pm-saved',
      token: 'tok_saved',
      label: 'Visa ····1111',
      isLastUsed: true,
      isDefault: false,
    })
    const deps = makeOrderDeps({
      useMockPayment: false,
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: { getBalanceByUserId: jest.fn().mockResolvedValue(29) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(
          makePlan({ id: 'plan-week', slug: 'week', priceSar: 125, mealCount: 5 })
        ),
      },
      paymentMethodLoader: {
        getMethodById: jest.fn().mockResolvedValue(null),
        getMethodsByUserId: jest.fn().mockResolvedValue([saved]),
      },
    })

    await makeUC(deps)({
      ...validInput,
      paymentMethodId: '00000000-0000-0000-0000-000000000001',
    })

    expect(deps.paymentGateway.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        amountSar: 96,
        paymentToken: 'tok_saved',
        metadata: expect.objectContaining({ paymentMethodId: 'pm-saved' }),
      })
    )
    expect(
      deps.paymentTransactionPersistor.createTransaction
    ).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethodId: 'pm-saved', amountSar: 96 })
    )
    expect(deps.walletPersistor.createDebitIfSufficient).toHaveBeenCalledWith(
      expect.objectContaining({ amountSar: -29 })
    )
    expect(deps.paymentMethodPersistor.markAsLastUsed).toHaveBeenCalledWith(
      'pm-saved',
      validInput.userId
    )
  })

  it.each(['cancelled', 'active'] as const)(
    'lets a %s plan that has ended be replaced by a new purchase',
    async status => {
      const ended = makeSubscription({
        status,
        endDate: '2020-01-01',
        orderId: 'old-order',
      })
      const deps = makeOrderDeps({
        subscriptionLoader: {
          ...buildDeps().subscriptionLoader,
          getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(ended),
        },
      })

      await makeUC(deps)(validInput)

      expect(deps.paymentGateway.charge).toHaveBeenCalled()
      expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
        ended.id,
        { status: 'expired' }
      )
      expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalled()
    }
  )

  it('reactivates a cancelled in-service plan on a zero-due promotion without a new subscription', async () => {
    const sub = makeSubscription({
      status: 'cancelled',
      endDate: '2099-12-31',
    })
    const session = makeCheckoutSession({
      promotionSubscriptionId: sub.id,
      priorPlanCreditSar: 500,
      walletCreditSar: 0,
      totalDueSar: 0,
      basePriceSar: 500,
    })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        createSubscription: jest.fn().mockResolvedValue(sub),
        updateSubscription: jest
          .fn()
          .mockResolvedValue({ ...sub, status: 'active' }),
      },
    })

    await makeUC(deps)(validInput)

    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.createSubscription).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({ status: 'active' })
    )
  })

  it('rejects hardcoded method ids when mock payments are off', async () => {
    const deps = makeOrderDeps({ useMockPayment: false })
    const createOrder = makeUC(deps)

    await expect(
      createOrder({
        ...validInput,
        paymentMethodId: '00000000-0000-0000-0000-000000000001',
      })
    ).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
  })

  it('charges a hardcoded method with the mock token only while mock payments are on', async () => {
    const deps = makeOrderDeps({ useMockPayment: true })
    const createOrder = makeUC(deps)

    await createOrder({
      ...validInput,
      paymentMethodId: '00000000-0000-0000-0000-000000000001',
    })

    expect(deps.paymentGateway.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentToken: 'mock_token',
        idempotencyKey: 'mock_tx_123',
      })
    )
  })

  it('skips the gateway when nothing is due and still creates the subscription', async () => {
    const session = makeCheckoutSession({
      walletCreditSar: 500,
      totalDueSar: 0,
      basePriceSar: 500,
    })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: { getBalanceByUserId: jest.fn().mockResolvedValue(500) },
    })

    const result = await makeUC(deps)(validInput)

    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.walletPersistor.createDebitIfSufficient).toHaveBeenCalledWith(
      expect.objectContaining({ amountSar: -500 })
    )
    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalled()
    expect(result.summary.total_paid_sar).toBe(0)
  })

  it('wallet-only checkout works without a real card when mock payments are off', async () => {
    const session = makeCheckoutSession({
      walletCreditSar: 28,
      totalDueSar: 0,
      basePriceSar: 28,
    })
    const deps = makeOrderDeps({
      useMockPayment: false,
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: { getBalanceByUserId: jest.fn().mockResolvedValue(50) },
    })

    const result = await makeUC(deps)({
      ...validInput,
      paymentMethodId: '00000000-0000-0000-0000-000000000001',
    })

    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalled()
    expect(result.summary.wallet_credit_sar).toBe(28)
    expect(result.summary.total_paid_sar).toBe(0)
  })

  it('refreshes wallet credit at order time when the session was created before wallet balance existed', async () => {
    const session = makeCheckoutSession({
      walletCreditSar: 0,
      totalDueSar: 28,
      basePriceSar: 28,
    })
    const deps = makeOrderDeps({
      useMockPayment: false,
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: { getBalanceByUserId: jest.fn().mockResolvedValue(50) },
    })

    await makeUC(deps)(validInput)

    expect(deps.checkoutSessionPersistor.updateSession).toHaveBeenCalledWith(
      validInput.sessionId,
      { walletCreditSar: 28, totalDueSar: 0 }
    )
    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.walletPersistor.createDebitIfSufficient).toHaveBeenCalledWith(
      expect.objectContaining({ amountSar: -28 })
    )
  })

  it('does not charge or debit when the wallet no longer covers the session credit', async () => {
    const session = makeCheckoutSession({
      walletCreditSar: 50,
      totalDueSar: 450,
    })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: { getBalanceByUserId: jest.fn().mockResolvedValue(10) },
    })

    await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
      errorCode: 'INSUFFICIENT_WALLET_BALANCE',
      statusCode: 422,
    })
    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.orderPersistor.createOrder).not.toHaveBeenCalled()
    expect(deps.walletPersistor.createDebitIfSufficient).not.toHaveBeenCalled()
  })

  it('does not debit an overdrawn wallet after the card charge', async () => {
    const session = makeCheckoutSession({
      walletCreditSar: 50,
      totalDueSar: 450,
    })
    const deps = makeOrderDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      walletLoader: {
        getBalanceByUserId: jest
          .fn()
          .mockResolvedValueOnce(50)
          .mockResolvedValueOnce(0),
      },
    })

    await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
      errorCode: 'INSUFFICIENT_WALLET_BALANCE',
    })
    expect(deps.paymentGateway.charge).toHaveBeenCalledTimes(1)
    expect(deps.orderPersistor.createOrder).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.createSubscription).not.toHaveBeenCalled()
    expect(
      deps.paymentTransactionPersistor.updateTransaction
    ).toHaveBeenCalledWith(
      'mock_tx_123',
      expect.objectContaining({ status: 'PAID_UNFULFILLED' })
    )
  })

  it('keeps the same idempotency key when the charge result is ambiguous', async () => {
    const deps = makeOrderDeps({
      paymentGateway: {
        charge: jest.fn().mockResolvedValue({
          success: false,
          ambiguous: true,
          gatewayPaymentId: 'mock_tx_123',
          status: 'error',
          errorMessage: 'timeout',
        }),
        fetchPayment: jest.fn(),
      },
    })

    await expect(makeUC(deps)(validInput)).rejects.toMatchObject({
      errorCode: 'PAYMENT_FAILED',
    })
    expect(deps.orderPersistor.createOrder).not.toHaveBeenCalled()
    expect(
      deps.paymentTransactionPersistor.updateTransaction
    ).toHaveBeenCalledWith(
      'mock_tx_123',
      expect.objectContaining({
        status: 'INITIATED',
        gatewayPaymentId: 'mock_tx_123',
      })
    )
    expect(deps.checkoutSessionPersistor.updateSession).toHaveBeenCalledWith(
      validInput.sessionId,
      { status: 'active' }
    )
  })

  it('fulfills a settled payment without charging again when the first write failed', async () => {
    const tx = {
      id: 'mock_tx_123',
      userId: validInput.userId,
      checkoutSessionId: validInput.sessionId,
      amountSar: 500,
      status: 'PAID_UNFULFILLED' as const,
      gatewayPaymentId: 'pay_123',
      startDate: validInput.startDate,
      paymentMethodId: validInput.paymentMethodId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const deps = makeOrderDeps({
      paymentTransactionLoader: {
        ...buildDeps().paymentTransactionLoader,
        getTransactionsByCheckoutSessionId: jest.fn().mockResolvedValue([tx]),
      },
    })

    await makeUC(deps)(validInput)

    expect(deps.paymentGateway.charge).not.toHaveBeenCalled()
    expect(deps.subscriptionPersistor.createSubscription).toHaveBeenCalledTimes(
      1
    )
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
