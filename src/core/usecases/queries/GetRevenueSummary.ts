import type { Deps } from '../../entitygateway/index.js'
import {
  PLAN_LABELS,
  PLAN_SLUGS,
  changeDirection,
  formatMonthLabel,
  pctChange,
  round1,
  todayKSA,
} from '../services/revenueUtils.js'

export function makeUC(deps: Deps) {
  return async function getRevenueSummary() {
    const { revenueLoader } = deps
    const today = todayKSA()
    const summary = await revenueLoader.getSummary(today)

    const mrrChange = summary.mrrAmountSar - summary.mrrPriorAmountSar
    const mrrChangePct = pctChange(summary.mrrAmountSar, summary.mrrPriorAmountSar)

    const skipChange = round1(summary.skipRateChange)

    const planCounts = new Map(
      summary.subscribersByPlan.map(row => [row.planSlug, row.count])
    )

    return {
      data: {
        mrr: {
          amount_sar: Math.round(summary.mrrAmountSar),
          change_pct: Math.abs(mrrChangePct),
          change_direction: changeDirection(mrrChange),
          comparison_label: 'vs last month',
        },
        subscriber_counts: {
          active: summary.activeCount,
          new_today: summary.newTodayCount,
          churned: summary.churnedCount,
        },
        subscribers_by_plan: PLAN_SLUGS.map(planSlug => ({
          plan_id: planSlug,
          plan_label: PLAN_LABELS[planSlug],
          count: planCounts.get(planSlug) ?? 0,
        })),
        key_metrics: {
          avg_skip_rate: {
            value: round1(summary.avgSkipRate),
            change: Math.abs(skipChange),
            change_direction: changeDirection(skipChange),
            comparison_label: 'vs last week',
          },
          salad_meal_pct: {
            value: Math.round(summary.saladMealPct),
            label: 'of active subs',
          },
        },
        as_of: new Date().toISOString(),
      },
    }
  }
}

export const name = 'GetRevenueSummary'
