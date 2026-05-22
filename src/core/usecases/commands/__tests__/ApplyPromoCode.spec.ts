import { makeUC } from '../ApplyPromoCode'
import {
  buildDeps,
  makeCheckoutSession,
  makePromoCode,
  makePlan,
  makeOrder,
} from '../../../../__tests__/helpers/mock-deps'

describe('ApplyPromoCode', () => {
  const validInput = {
    userId: 'user-uuid-1',
    sessionId: 'sess-uuid-1',
    code: 'TESTREF10',
  }

  function makeActiveDeps(sessionOverrides = {}, promoOverrides = {}) {
    const session = makeCheckoutSession(sessionOverrides)
    const promo = makePromoCode(promoOverrides)
    const plan = makePlan({ id: session.planId })

    return buildDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(promo),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({
          ...session,
          promoCode: 'TESTREF10',
          promoDiscountSar: promo.discountSar,
          totalDueSar: Math.max(0, session.basePriceSar - session.walletCreditSar - (promo as any).discountSar),
          promoAttemptCount: 0,
          promoLocked: false,
        }),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
    })
  }

  it('applies a valid referral code and reduces the total', async () => {
    const deps = makeActiveDeps()
    const applyPromoCode = makeUC(deps)

    const result = await applyPromoCode(validInput)

    expect(result.promo_code).toBe('TESTREF10')
    expect(result.promo_discount_sar).toBe(100)
    expect(result.total_due_sar).toBe(400) // 500 - 100
    expect(result.promo_locked).toBe(false)
  })

  it('applies a general promo code (non-referral) without checking new-user status', async () => {
    const existingUserOrder = makeOrder()
    const deps = makeActiveDeps({}, { type: 'promo', discountSar: 50 })
    // Override orderLoader to indicate existing user
    ;(deps.orderLoader.getLastOrderByUserId as jest.Mock).mockResolvedValue(existingUserOrder)
    const applyPromoCode = makeUC(deps)

    const result = await applyPromoCode(validInput)

    expect(result.promo_discount_sar).toBe(50)
  })

  it('throws SessionExpiredError when the session status is expired', async () => {
    const expiredSession = makeCheckoutSession({ status: 'expired' })
    const deps = buildDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(expiredSession),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'SESSION_EXPIRED',
      statusCode: 410,
    })
  })

  it('throws SessionExpiredError when session TTL has elapsed', async () => {
    const pastExpiry = makeCheckoutSession({ expiresAt: new Date(Date.now() - 1000) })
    const deps = buildDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(pastExpiry),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'SESSION_EXPIRED',
      statusCode: 410,
    })
  })

  it('throws PromoLockedError immediately when the session is already locked', async () => {
    const lockedSession = makeCheckoutSession({ promoLocked: true, promoAttemptCount: 10 })
    const deps = buildDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(lockedSession),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'PROMO_LOCKED',
      statusCode: 423,
    })
    expect(deps.promoCodeLoader.getPromoByCode).not.toHaveBeenCalled()
  })

  it('throws InvalidCodeError for a non-existent code and increments attempt count', async () => {
    const session = makeCheckoutSession({ promoAttemptCount: 2 })
    const deps = buildDeps({
      checkoutSessionLoader: {
        getSessionById: jest.fn().mockResolvedValue(session),
      },
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(null),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({ ...session, promoAttemptCount: 3 }),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'INVALID_CODE',
      statusCode: 422,
    })
    expect(deps.checkoutSessionPersistor.updateSession).toHaveBeenCalledWith(
      session.id,
      expect.objectContaining({ promoAttemptCount: 3 })
    )
  })

  it('throws InvalidCodeError for an inactive promo code', async () => {
    const session = makeCheckoutSession()
    const inactivePromo = makePromoCode({ isActive: false })
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(inactivePromo) },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({ ...session, promoAttemptCount: 1 }),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'INVALID_CODE',
    })
  })

  it('throws InvalidCodeError for a fully-exhausted promo code', async () => {
    const session = makeCheckoutSession()
    const exhaustedPromo = makePromoCode({ maxUses: 10, timesUsed: 10 })
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(exhaustedPromo) },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({ ...session, promoAttemptCount: 1 }),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'INVALID_CODE',
    })
  })

  it('locks the promo field and throws PromoLockedError on the 10th invalid attempt', async () => {
    const session = makeCheckoutSession({ promoAttemptCount: 9 })
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(null) },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({ ...session, promoAttemptCount: 10, promoLocked: true }),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'PROMO_LOCKED',
      statusCode: 423,
    })

    expect(deps.checkoutSessionPersistor.updateSession).toHaveBeenCalledWith(
      session.id,
      expect.objectContaining({ promoAttemptCount: 10, promoLocked: true })
    )
  })

  it('throws NotNewUserError when a referral code is used by an existing subscriber', async () => {
    const existingOrder = makeOrder()
    const session = makeCheckoutSession()
    const referralPromo = makePromoCode({ type: 'referral' })
    const plan = makePlan()
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(referralPromo) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(existingOrder),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'NOT_NEW_USER',
      statusCode: 422,
    })
  })

  it('throws PlanMismatchError when the code is scoped to a different plan', async () => {
    const session = makeCheckoutSession({ planId: 'plan-uuid-month' })
    const scopedPromo = makePromoCode({ validForPlanSlug: 'week', type: 'promo' })
    const plan = makePlan({ slug: 'month' })
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(scopedPromo) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({ ...session, promoAttemptCount: 1 }),
      },
    })
    const applyPromoCode = makeUC(deps)

    await expect(applyPromoCode(validInput)).rejects.toMatchObject({
      errorCode: 'PLAN_MISMATCH',
      statusCode: 422,
    })
  })

  it('accepts a promo code with no plan restriction (validForPlanSlug is null)', async () => {
    const session = makeCheckoutSession()
    const universalPromo = makePromoCode({ type: 'promo', validForPlanSlug: null })
    const plan = makePlan()
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(universalPromo) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({
          ...session,
          promoCode: 'TESTREF10',
          promoDiscountSar: 100,
          totalDueSar: 400,
          promoAttemptCount: 0,
          promoLocked: false,
        }),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const applyPromoCode = makeUC(deps)

    const result = await applyPromoCode(validInput)
    expect(result.promo_code).toBe('TESTREF10')
  })

  it('promo codes with maxUses=null have unlimited uses', async () => {
    const unlimitedPromo = makePromoCode({ maxUses: null, timesUsed: 999, type: 'promo' })
    const session = makeCheckoutSession()
    const plan = makePlan()
    const deps = buildDeps({
      checkoutSessionLoader: { getSessionById: jest.fn().mockResolvedValue(session) },
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(unlimitedPromo) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        updateSession: jest.fn().mockResolvedValue({
          ...session,
          promoCode: 'TESTREF10',
          promoDiscountSar: 100,
          totalDueSar: 400,
          promoAttemptCount: 0,
          promoLocked: false,
        }),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const applyPromoCode = makeUC(deps)

    const result = await applyPromoCode(validInput)
    expect(result.promo_code).toBe('TESTREF10')
  })
})
