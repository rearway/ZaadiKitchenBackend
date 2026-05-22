import { makeUC } from '../ValidateReferral'
import {
  buildDeps,
  makePromoCode,
  makePlan,
  makeOrder,
} from '../../../../__tests__/helpers/mock-deps'

describe('ValidateReferral', () => {
  const validInput = { userId: 'user-uuid-1', code: 'TESTREF10', planId: 'month' }

  function makeValidDeps(promoOverrides = {}, hasOrder = false) {
    const promo = makePromoCode(promoOverrides)
    const plan = makePlan({ slug: 'month' })
    return buildDeps({
      promoCodeLoader: {
        getPromoByCode: jest.fn().mockResolvedValue(promo),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(hasOrder ? makeOrder() : null),
      },
    })
  }

  it('returns valid=true for a valid referral code used by a new user', async () => {
    const deps = makeValidDeps({ type: 'referral' }, false)
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.code).toBe('TESTREF10')
      expect(result.discount_type).toBe('referral')
      expect(result.discount_sar).toBe(100)
      expect(result.description).toBe('Referral discount')
    }
  })

  it('returns valid=true for a general promo code regardless of user history', async () => {
    const deps = makeValidDeps({ type: 'promo', discountSar: 50 }, true)
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.discount_type).toBe('promo')
      expect(result.description).toBe('Promo discount')
    }
  })

  it('returns INVALID_CODE for a non-existent code', async () => {
    const deps = buildDeps({
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(null) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(makePlan()),
      },
      orderLoader: { ...buildDeps().orderLoader, getLastOrderByUserId: jest.fn().mockResolvedValue(null) },
    })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error_code).toBe('INVALID_CODE')
    }
  })

  it('returns INVALID_CODE for an inactive promo code', async () => {
    const deps = makeValidDeps({ isActive: false })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error_code).toBe('INVALID_CODE')
    }
  })

  it('returns INVALID_CODE when the code has reached its max uses', async () => {
    const deps = makeValidDeps({ maxUses: 5, timesUsed: 5 })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error_code).toBe('INVALID_CODE')
    }
  })

  it('returns valid=true when timesUsed < maxUses', async () => {
    const deps = makeValidDeps({ maxUses: 10, timesUsed: 5, type: 'promo' })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(true)
  })

  it('returns valid=true when maxUses is null (unlimited)', async () => {
    const deps = makeValidDeps({ maxUses: null, timesUsed: 9999, type: 'promo' })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(true)
  })

  it('returns PLAN_MISMATCH when code is scoped to a different plan', async () => {
    const scopedPromo = makePromoCode({ validForPlanSlug: 'week', type: 'promo' })
    const plan = makePlan({ slug: 'month' })
    const deps = buildDeps({
      promoCodeLoader: { getPromoByCode: jest.fn().mockResolvedValue(scopedPromo) },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(plan),
      },
      orderLoader: { ...buildDeps().orderLoader, getLastOrderByUserId: jest.fn().mockResolvedValue(null) },
    })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error_code).toBe('PLAN_MISMATCH')
    }
  })

  it('returns valid=true when code has no plan restriction and any plan is selected', async () => {
    const deps = makeValidDeps({ validForPlanSlug: null, type: 'promo' })
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(true)
  })

  it('returns NOT_NEW_USER when a referral code is used by an existing subscriber', async () => {
    const deps = makeValidDeps({ type: 'referral' }, true)
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error_code).toBe('NOT_NEW_USER')
    }
  })

  it('does not check order history for promo (non-referral) codes', async () => {
    const deps = makeValidDeps({ type: 'promo' }, true)
    const validateReferral = makeUC(deps)

    const result = await validateReferral(validInput)

    expect(result.valid).toBe(true)
  })
})
