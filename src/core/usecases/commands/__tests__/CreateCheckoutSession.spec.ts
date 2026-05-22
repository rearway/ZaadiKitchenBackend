import { makeUC } from '../CreateCheckoutSession'
import {
  buildDeps,
  makePlan,
  makeCheckoutSession,
} from '../../../../__tests__/helpers/mock-deps'

describe('CreateCheckoutSession', () => {
  const validInput = {
    userId: 'user-uuid-1',
    planId: 'month',
    mealType: 'executive' as const,
  }

  it('creates a session for a valid plan and returns pricing details', async () => {
    const plan = makePlan()
    const session = makeCheckoutSession({ basePriceSar: 500, walletCreditSar: 0, totalDueSar: 500 })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
      },
    })
    const createCheckoutSession = makeUC(deps)

    const result = await createCheckoutSession(validInput)

    expect(result.session_id).toBe(session.id)
    expect(result.plan_id).toBe('month')
    expect(result.meal_type).toBe('executive')
    expect(result.base_price_sar).toBe(500)
    expect(result.promo_discount_sar).toBe(0)
    expect(result.promo_code).toBeNull()
    expect(result.promo_locked).toBe(false)
  })

  it('auto-applies full wallet credit when balance is less than plan price', async () => {
    const plan = makePlan({ priceSar: 500 })
    const session = makeCheckoutSession({ walletCreditSar: 50, totalDueSar: 450 })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(50),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
        expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
      },
    })
    const createCheckoutSession = makeUC(deps)

    await createCheckoutSession(validInput)

    expect(deps.checkoutSessionPersistor.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        walletCreditSar: 50,
        totalDueSar: 450,
      })
    )
  })

  it('caps wallet credit at the plan price so total_due never goes negative', async () => {
    const plan = makePlan({ priceSar: 500 })
    const session = makeCheckoutSession({ walletCreditSar: 500, totalDueSar: 0 })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(9999),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
        expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
      },
    })
    const createCheckoutSession = makeUC(deps)

    await createCheckoutSession(validInput)

    expect(deps.checkoutSessionPersistor.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        walletCreditSar: 500,
        totalDueSar: 0,
      })
    )
  })

  it('expires all existing active sessions before creating a new one', async () => {
    const plan = makePlan()
    const session = makeCheckoutSession()
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
        expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
      },
    })
    const createCheckoutSession = makeUC(deps)

    await createCheckoutSession(validInput)

    expect(deps.checkoutSessionPersistor.expireAllUserSessions).toHaveBeenCalledWith('user-uuid-1')
    // expireAll must be called before createSession
    const expireCallOrder = (deps.checkoutSessionPersistor.expireAllUserSessions as jest.Mock).mock.invocationCallOrder[0]
    const createCallOrder = (deps.checkoutSessionPersistor.createSession as jest.Mock).mock.invocationCallOrder[0]
    expect(expireCallOrder).toBeLessThan(createCallOrder)
  })

  it('sets an expires_at approximately 10 minutes in the future', async () => {
    const plan = makePlan()
    const session = makeCheckoutSession({ expiresAt: new Date(Date.now() + 10 * 60 * 1000) })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
        expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
      },
    })
    const createCheckoutSession = makeUC(deps)

    const result = await createCheckoutSession(validInput)

    const expiresAt = new Date(result.expires_at)
    const diffMs = expiresAt.getTime() - Date.now()
    expect(diffMs).toBeGreaterThan(9 * 60 * 1000)
    expect(diffMs).toBeLessThanOrEqual(11 * 60 * 1000)
  })

  it('throws ResourceNotFoundError when the plan slug does not exist', async () => {
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(null),
      },
    })
    const createCheckoutSession = makeUC(deps)

    await expect(createCheckoutSession({ ...validInput, planId: 'nonexistent' })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
    expect(deps.checkoutSessionPersistor.createSession).not.toHaveBeenCalled()
  })

  it('throws ResourceNotFoundError for an inactive plan', async () => {
    const inactivePlan = makePlan({ isActive: false })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(inactivePlan),
      },
    })
    const createCheckoutSession = makeUC(deps)

    await expect(createCheckoutSession(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('returns promo_attempt_count=0 and promo_locked=false on fresh session', async () => {
    const plan = makePlan()
    const session = makeCheckoutSession()
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
        expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
      },
    })
    const createCheckoutSession = makeUC(deps)

    const result = await createCheckoutSession(validInput)

    expect(result.promo_attempt_count).toBe(0)
    expect(result.promo_locked).toBe(false)
  })
})
