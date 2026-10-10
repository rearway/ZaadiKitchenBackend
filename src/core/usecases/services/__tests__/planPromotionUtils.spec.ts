import {
  assertCanPromote,
  canPromote,
  computePromotionAmounts,
  getPromotionTargets,
} from '../planPromotionUtils.js'
import {
  PlanPromotionNotAllowedError,
  SamePlanNotAllowedError,
} from '../../../../shared/errors/domain.errors.js'

describe('planPromotionUtils', () => {
  it('returns promotion targets per tier', () => {
    expect(getPromotionTargets('try_it')).toEqual(['week', 'month', 'quarterly'])
    expect(getPromotionTargets('week')).toEqual(['month', 'quarterly'])
    expect(getPromotionTargets('month')).toEqual(['quarterly'])
    expect(getPromotionTargets('quarterly')).toEqual([])
  })

  it('allows upgrades only', () => {
    expect(canPromote('try_it', 'week')).toBe(true)
    expect(canPromote('week', 'month')).toBe(true)
    expect(canPromote('month', 'quarterly')).toBe(true)
    expect(canPromote('month', 'week')).toBe(false)
    expect(canPromote('week', 'try_it')).toBe(false)
    expect(canPromote('month', 'month')).toBe(false)
  })

  it('throws SamePlanNotAllowedError for same slug', () => {
    expect(() => assertCanPromote('week', 'week')).toThrow(SamePlanNotAllowedError)
  })

  it('throws PlanPromotionNotAllowedError for downgrade', () => {
    expect(() => assertCanPromote('month', 'week')).toThrow(PlanPromotionNotAllowedError)
  })

  it('computes promotion checkout amounts with credit then wallet', () => {
    const result = computePromotionAmounts({
      newPlanPriceSar: 125,
      priorPlanCreditSar: 28,
      walletBalanceSar: 10,
    })
    expect(result.priorPlanCreditSar).toBe(28)
    expect(result.amountAfterCreditSar).toBe(97)
    expect(result.walletCreditSar).toBe(10)
    expect(result.totalDueSar).toBe(87)
  })
})
