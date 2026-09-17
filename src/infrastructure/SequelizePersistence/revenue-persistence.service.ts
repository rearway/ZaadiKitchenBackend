import { Injectable } from '@nestjs/common'
import { QueryTypes } from 'sequelize'
import type {
  RevenueLoader,
  RevenueSummaryData,
  RevenueDailyDay,
} from '../../core/entitygateway/Revenue.js'
import { lastDayOfPreviousMonth } from '../../core/usecases/services/revenueUtils.js'
import { OrderModel } from './models/index.js'

interface CountRow {
  count: string
}

interface SumRow {
  total: string | null
}

interface PlanCountRow {
  planSlug: string
  count: string
}

interface DailyRevenueRow {
  date: string
  revenueSar: string
}

interface MonthRow {
  month: string
}

@Injectable()
export class RevenuePersistenceService implements RevenueLoader {
  async getSummary(todayKsa: string): Promise<RevenueSummaryData> {
    const sequelize = OrderModel.sequelize!
    const priorMonthEnd = lastDayOfPreviousMonth(todayKsa)
    const todayMinus3 = this.addDays(todayKsa, -3)

    const [[mrrRow], [mrrPriorRow], [activeRow], [newTodayRow], [churnedRow], planRows, [skipRow], [skipCurrentWeekRow], [skipPriorWeekRow], [saladRow]] =
      await Promise.all([
        sequelize.query<SumRow>(
          `SELECT COALESCE(SUM(p.price_sar), 0) AS total
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.status IN ('active', 'paused')
             AND s.end_date >= :todayKsa::date`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<SumRow>(
          `SELECT COALESCE(SUM(p.price_sar), 0) AS total
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.start_date <= :priorMonthEnd::date
             AND s.end_date >= :priorMonthEnd::date
             AND s.status IN ('active', 'paused', 'cancelled')`,
          { replacements: { priorMonthEnd }, type: QueryTypes.SELECT }
        ),
        sequelize.query<CountRow>(
          `SELECT COUNT(*) AS count
           FROM subscriptions s
           WHERE s.status = 'active'
             AND s.end_date >= :todayKsa::date`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<CountRow>(
          `SELECT COUNT(DISTINCT u.id) AS count
           FROM users u
           JOIN subscriptions s ON s.user_id = u.id
           WHERE u.role = 'CUSTOMER'
             AND s.start_date = :todayKsa::date
             AND s.id = (
               SELECT id FROM subscriptions sub
               WHERE sub.user_id = u.id
               ORDER BY sub.created_at ASC
               LIMIT 1
             )`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<CountRow>(
          `SELECT COUNT(*) AS count
           FROM (
             SELECT DISTINCT ON (s.user_id) s.user_id, s.status, s.end_date, s.created_at
             FROM subscriptions s
             ORDER BY s.user_id, s.created_at DESC
           ) latest
           WHERE latest.status = 'expired'
             AND latest.end_date <= :todayMinus3::date
             AND NOT EXISTS (
               SELECT 1 FROM subscriptions s2
               WHERE s2.user_id = latest.user_id
                 AND s2.created_at > latest.created_at
             )`,
          { replacements: { todayMinus3 }, type: QueryTypes.SELECT }
        ),
        sequelize.query<PlanCountRow>(
          `SELECT p.slug AS "planSlug", COUNT(*) AS count
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE s.status = 'active'
             AND s.end_date >= :todayKsa::date
           GROUP BY p.slug`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<SumRow>(
          `SELECT COALESCE(AVG(s.skip_days_used), 0) AS total
           FROM subscriptions s
           WHERE s.status = 'active'
             AND s.end_date >= :todayKsa::date`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<SumRow>(
          `SELECT COALESCE(
             COUNT(dd.id)::float / NULLIF(
               (SELECT COUNT(*) FROM subscriptions s
                WHERE s.status = 'active' AND s.end_date >= :todayKsa::date),
               0
             ),
             0
           ) AS total
           FROM delivery_days dd
           WHERE dd.status = 'skipped'
             AND dd.date >= (:todayKsa::date - INTERVAL '6 days')
             AND dd.date <= :todayKsa::date`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<SumRow>(
          `SELECT COALESCE(
             COUNT(dd.id)::float / NULLIF(
               (SELECT COUNT(*) FROM subscriptions s
                WHERE s.status = 'active' AND s.end_date >= :todayKsa::date),
               0
             ),
             0
           ) AS total
           FROM delivery_days dd
           WHERE dd.status = 'skipped'
             AND dd.date >= (:todayKsa::date - INTERVAL '13 days')
             AND dd.date < (:todayKsa::date - INTERVAL '6 days')`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
        sequelize.query<SumRow>(
          `SELECT COALESCE(
             100.0 * SUM(CASE WHEN s.meal_type = 'salad' THEN 1 ELSE 0 END)
             / NULLIF(COUNT(*), 0),
             0
           ) AS total
           FROM subscriptions s
           WHERE s.status = 'active'
             AND s.end_date >= :todayKsa::date`,
          { replacements: { todayKsa }, type: QueryTypes.SELECT }
        ),
      ])

    return {
      mrrAmountSar: Number(mrrRow?.total ?? 0),
      mrrPriorAmountSar: Number(mrrPriorRow?.total ?? 0),
      activeCount: parseInt(activeRow?.count ?? '0', 10),
      newTodayCount: parseInt(newTodayRow?.count ?? '0', 10),
      churnedCount: parseInt(churnedRow?.count ?? '0', 10),
      subscribersByPlan: planRows.map(row => ({
        planSlug: row.planSlug,
        count: parseInt(row.count, 10),
      })),
      avgSkipRate: Number(skipRow?.total ?? 0),
      skipRateChange:
        Number(skipCurrentWeekRow?.total ?? 0) - Number(skipPriorWeekRow?.total ?? 0),
      saladMealPct: Number(saladRow?.total ?? 0),
    }
  }

  async getDailyRevenue(dates: string[]): Promise<RevenueDailyDay[]> {
    if (dates.length === 0) return []

    const sequelize = OrderModel.sequelize!
    const rows = await sequelize.query<DailyRevenueRow>(
      `SELECT
         TO_CHAR((o.created_at AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') AS date,
         COALESCE(SUM(o.total_paid_sar), 0) AS "revenueSar"
       FROM orders o
       WHERE o.status = 'confirmed'
         AND (o.created_at AT TIME ZONE 'Asia/Riyadh')::date IN (:dates)
       GROUP BY (o.created_at AT TIME ZONE 'Asia/Riyadh')::date`,
      { replacements: { dates }, type: QueryTypes.SELECT }
    )

    const revenueByDate = new Map(
      rows.map(row => [row.date, Number(row.revenueSar)])
    )

    return dates.map(date => ({
      date,
      revenueSar: revenueByDate.get(date) ?? 0,
    }))
  }

  async getAvailableRevenueMonths(currentMonth: string): Promise<string[]> {
    const sequelize = OrderModel.sequelize!
    const rows = await sequelize.query<MonthRow>(
      `SELECT DISTINCT TO_CHAR((created_at AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM') AS month
       FROM orders
       WHERE status = 'confirmed'
       ORDER BY month DESC`,
      { type: QueryTypes.SELECT }
    )

    const months = rows.map(row => row.month)
    if (!months.includes(currentMonth)) {
      months.unshift(currentMonth)
    }
    return months
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }
}
