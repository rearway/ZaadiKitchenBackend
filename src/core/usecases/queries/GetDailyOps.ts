import type { Deps } from '../../entitygateway/index.js'
import { computeEffectiveStage, MANUAL_STAGE_ORDER } from '../services/dailyOpsStage.js'
import { getSkipCutoffTimestamp, getDayLabel } from '../services/weekUtils.js'

export interface GetDailyOpsInput {
  date?: string
  role: 'admin' | 'ops'
  issuesStatus?: 'open' | 'all'
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  wrong_order: 'Wrong order',
  quality_issue: 'Quality issue',
  not_delivered: 'Not delivered',
  damaged: 'Damaged',
}

const STAGE_LABELS: Record<string, string> = {
  locked: 'Locked',
  dispatch: 'Dispatch',
  delivered: 'Delivered',
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(date: string): string {
  const today = todayIsoDate()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = new Date(date)
  const shortLabel = `${getDayLabel(date)} ${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`
  if (date === today) return `Today — ${shortLabel}`
  if (date === yesterday) return `Yesterday — ${shortLabel}`
  return shortLabel
}

export function makeUC(deps: Deps) {
  return async function getDailyOps(input: GetDailyOpsInput) {
    const { logger, dailyOpsDayLoader, deliveryDayLoader, deliveryIssueLoader } = deps

    try {
      const date = input.date ?? todayIsoDate()

      const [day, mealCounts, openIssues] = await Promise.all([
        dailyOpsDayLoader.getByDate(date),
        deliveryDayLoader.getMealBreakdownByDate(date),
        input.role === 'admin'
          ? deliveryIssueLoader.getOpenIssuesByDate(date, input.issuesStatus ?? 'open')
          : Promise.resolve(null),
      ])

      const stage = computeEffectiveStage(day, date)
      const stageIndex = MANUAL_STAGE_ORDER.indexOf(stage as (typeof MANUAL_STAGE_ORDER)[number])

      const stages = MANUAL_STAGE_ORDER.map((id, i) => ({
        id,
        label: STAGE_LABELS[id],
        status: stageIndex === -1 ? 'pending' : i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending',
      }))

      const total = mealCounts.reduce((sum, r) => sum + r.count, 0)
      const rows = mealCounts.map(r => ({
        type: r.mealType,
        label: r.mealType === 'executive' ? 'Executive' : 'Salad',
        count: r.count,
        pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
      }))

      const canAdvance = stage === 'locked' || stage === 'dispatch'
      const advanceLabel = stage === 'locked' ? 'Mark as Dispatched →' : stage === 'dispatch' ? 'Mark as Delivered →' : null

      const lockedAt = stage !== 'pending' ? getSkipCutoffTimestamp(date) : null
      const lockedNote =
        stage !== 'pending'
          ? `Cutoff passed at 6:00 PM · Meal count frozen at ${total} deliveries`
          : null

      const issuesQueue =
        openIssues === null
          ? null
          : {
              open_count: openIssues.length,
              issues: openIssues.map(iss => ({
                issue_id: iss.issueId,
                customer_id: iss.customerId,
                customer_name: iss.customerName,
                customer_phone: iss.customerPhone,
                delivery_address: iss.deliveryAddress,
                issue_type: iss.issueType,
                issue_type_label: ISSUE_TYPE_LABELS[iss.issueType] ?? iss.issueType,
                description: iss.description,
                submitted_at: iss.submittedAt,
                delivery_date: iss.deliveryDate,
                meal_name: iss.mealName,
                meal_type: iss.mealType,
                plan_price_sar: iss.planPricePerMealSar,
                status: iss.status,
                resolved_at: iss.resolvedAt,
                resolution: iss.status === 'credited' ? 'credit' : iss.status === 'rejected' ? 'rejected' : null,
              })),
            }

      return {
        date,
        date_label: formatDateLabel(date),
        pipeline: {
          stage,
          stages,
          ...(input.role === 'admin' ? { locked_at: lockedAt } : {}),
          locked_note: lockedNote,
          can_advance: canAdvance,
          advance_label: advanceLabel,
        },
        meal_breakdown: { total, rows },
        issues_queue: issuesQueue,
      }
    } catch (error) {
      logger.error('GetDailyOps failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetDailyOps'
