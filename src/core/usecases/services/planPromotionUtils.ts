import {
  PlanPromotionNotAllowedError,
  SamePlanNotAllowedError,
} from '../../../shared/errors/domain.errors.js'

export const PLAN_TIER_RANK: Record<string, number> = {
  try_it: 1,
  week: 2,
  weekly: 2,
  month: 3,
  quarterly: 4,
}

export function normalizePlanSlug(slug: string): string {
  return slug === 'weekly' ? 'week' : slug
}

export function getPlanTierRank(slug: string): number {
  const key = normalizePlanSlug(slug)
  const rank = PLAN_TIER_RANK[key]
  if (rank === undefined) {
    throw new Error(`Unknown plan slug: ${slug}`)
  }
  return rank
}

const PROMOTION_TARGETS: Record<string, string[]> = {
  try_it: ['week', 'month', 'quarterly'],
  week: ['month', 'quarterly'],
  month: ['quarterly'],
  quarterly: [],
}

export function getPromotionTargets(currentSlug: string): string[] {
  const key = normalizePlanSlug(currentSlug)
  return PROMOTION_TARGETS[key] ?? []
}

export function canPromote(fromSlug: string, toSlug: string): boolean {
  const from = normalizePlanSlug(fromSlug)
  const to = normalizePlanSlug(toSlug)
  if (from === to) return false
  return getPlanTierRank(to) > getPlanTierRank(from)
}

export function assertCanPromote(fromSlug: string, toSlug: string): void {
  const from = normalizePlanSlug(fromSlug)
  const to = normalizePlanSlug(toSlug)

  if (from === to) {
    throw new SamePlanNotAllowedError()
  }

  if (getPlanTierRank(to) <= getPlanTierRank(from)) {
    throw new PlanPromotionNotAllowedError(from, to)
  }
}

export function roundSar(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function computePromotionAmounts(params: {
  newPlanPriceSar: number
  priorPlanCreditSar: number
  walletBalanceSar: number
}): {
  priorPlanCreditSar: number
  amountAfterCreditSar: number
  walletCreditSar: number
  totalDueSar: number
} {
  const priorPlanCreditSar = roundSar(params.priorPlanCreditSar)
  const amountAfterCreditSar = roundSar(
    Math.max(0, params.newPlanPriceSar - priorPlanCreditSar)
  )
  const walletCreditSar = roundSar(
    Math.min(params.walletBalanceSar, amountAfterCreditSar)
  )
  const totalDueSar = roundSar(amountAfterCreditSar - walletCreditSar)

  return {
    priorPlanCreditSar,
    amountAfterCreditSar,
    walletCreditSar,
    totalDueSar,
  }
}
