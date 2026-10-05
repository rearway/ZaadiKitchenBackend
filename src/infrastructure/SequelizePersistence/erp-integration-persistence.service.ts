import { Injectable } from '@nestjs/common'
import { QueryTypes } from 'sequelize'
import type {
  ErpIntegrationLoader,
  ErpMenuRow,
  ErpCustomerRow,
  ErpPaymentRow,
  ErpDailyOrderRow,
} from '../../core/entitygateway/ErpIntegration.js'
import { MealModel } from './models/MealModel.js'

@Injectable()
export class ErpIntegrationPersistenceService implements ErpIntegrationLoader {
  async getMenus(offset: number, limit: number): Promise<{ rows: ErpMenuRow[]; total: number }> {
    const { count, rows } = await MealModel.findAndCountAll({
      order: [['name_en', 'ASC']],
      offset,
      limit,
      attributes: ['erpCode', 'nameEn', 'chefNote', 'status'],
    })
    return {
      total: count,
      rows: rows.map(m => ({
        code: m.erpCode,
        name: m.nameEn,
        description: m.chefNote?.trim() || '',
        status: m.status,
      })),
    }
  }

  async getCustomers(
    offset: number,
    limit: number
  ): Promise<{ rows: ErpCustomerRow[]; total: number }> {
    const sequelize = MealModel.sequelize!
    const [{ count }] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users u WHERE u.role = 'CUSTOMER' AND u.erp_customer_code IS NOT NULL`,
      { type: QueryTypes.SELECT }
    )
    const total = parseInt(count, 10)

    const rows = await sequelize.query<{
      code: string
      name: string
      mobile: string | null
      status_code: number
    }>(
      `SELECT u.erp_customer_code AS code,
              u.full_name AS name,
              u.phone AS mobile,
              CASE
                WHEN u.deleted_at IS NOT NULL THEN 0
                WHEN u.is_active = false THEN 0
                WHEN EXISTS (
                  SELECT 1 FROM subscriptions s
                  WHERE s.user_id = u.id AND s.status = 'active'
                ) THEN 1
                ELSE 0
              END AS status_code
       FROM users u
       WHERE u.role = 'CUSTOMER' AND u.erp_customer_code IS NOT NULL
       ORDER BY u.full_name ASC
       LIMIT :limit OFFSET :offset`,
      { replacements: { limit, offset }, type: QueryTypes.SELECT }
    )

    return {
      total,
      rows: rows.map(r => ({
        code: r.code,
        name: r.name,
        mobile: formatMobileForErp(r.mobile),
        statusCode: r.status_code,
      })),
    }
  }

  async getPayments(
    dateFrom: string,
    dateTo: string,
    offset: number,
    limit: number
  ): Promise<{ rows: ErpPaymentRow[]; total: number }> {
    const sequelize = MealModel.sequelize!

    const [{ count }] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.status = 'confirmed'
         AND u.erp_customer_code IS NOT NULL
         AND (o.created_at AT TIME ZONE 'Asia/Riyadh')::date >= :dateFrom::date
         AND (o.created_at AT TIME ZONE 'Asia/Riyadh')::date <= :dateTo::date`,
      { replacements: { dateFrom, dateTo }, type: QueryTypes.SELECT }
    )
    const total = parseInt(count, 10)

    const rows = await sequelize.query<{
      customer_code: string
      menu_code: string
      total_count: number
      amount: string
    }>(
      `SELECT u.erp_customer_code AS customer_code,
              p.slug AS menu_code,
              o.meal_count AS total_count,
              TRIM(to_char(o.total_paid_sar, '999999990.99')) AS amount
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN plans p ON p.id = o.plan_id
       WHERE o.status = 'confirmed'
         AND u.erp_customer_code IS NOT NULL
         AND (o.created_at AT TIME ZONE 'Asia/Riyadh')::date >= :dateFrom::date
         AND (o.created_at AT TIME ZONE 'Asia/Riyadh')::date <= :dateTo::date
       ORDER BY o.created_at ASC
       LIMIT :limit OFFSET :offset`,
      { replacements: { dateFrom, dateTo, limit, offset }, type: QueryTypes.SELECT }
    )

    return {
      total,
      rows: rows.map(r => ({
        customerCode: r.customer_code,
        menuCode: r.menu_code,
        totalCount: Number(r.total_count),
        amount: normalizeAmount(r.amount),
      })),
    }
  }

  async getDailyOrders(
    deliveryDate: string,
    offset: number,
    limit: number
  ): Promise<{ rows: ErpDailyOrderRow[]; total: number }> {
    const sequelize = MealModel.sequelize!

    const [{ count }] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM delivery_days dd
       JOIN users u ON u.id = dd.user_id
       LEFT JOIN menu_slots ms
         ON ms.delivery_date = dd.date
        AND ms.meal_type::text = dd.meal_type::text
       LEFT JOIN menu_weeks mw
         ON mw.id = ms.week_id
        AND mw.date_from <= dd.date
        AND mw.date_to >= dd.date
        AND mw.status = 'published'
       LEFT JOIN meals m ON m.id = ms.meal_id
       JOIN subscriptions s ON s.id = dd.subscription_id
       JOIN plans p ON p.id = s.plan_id
       WHERE dd.date = :deliveryDate
         AND dd.status IN ('scheduled', 'past_cutoff', 'delivered')
         AND u.erp_customer_code IS NOT NULL
         AND m.erp_code IS NOT NULL`,
      { replacements: { deliveryDate }, type: QueryTypes.SELECT }
    )
    const total = parseInt(count, 10)

    const rows = await sequelize.query<{
      customer_code: string
      menu_code: string
      amount: string
    }>(
      `SELECT u.erp_customer_code AS customer_code,
              m.erp_code AS menu_code,
              TRIM(to_char(p.price_per_meal_sar, '999999990.99')) AS amount
       FROM delivery_days dd
       JOIN users u ON u.id = dd.user_id
       JOIN subscriptions s ON s.id = dd.subscription_id
       JOIN plans p ON p.id = s.plan_id
       LEFT JOIN menu_slots ms
         ON ms.delivery_date = dd.date
        AND ms.meal_type::text = dd.meal_type::text
       LEFT JOIN menu_weeks mw
         ON mw.id = ms.week_id
        AND mw.date_from <= dd.date
        AND mw.date_to >= dd.date
        AND mw.status = 'published'
       LEFT JOIN meals m ON m.id = ms.meal_id
       WHERE dd.date = :deliveryDate
         AND dd.status IN ('scheduled', 'past_cutoff', 'delivered')
         AND u.erp_customer_code IS NOT NULL
         AND m.erp_code IS NOT NULL
       ORDER BY u.erp_customer_code ASC
       LIMIT :limit OFFSET :offset`,
      { replacements: { deliveryDate, limit, offset }, type: QueryTypes.SELECT }
    )

    return {
      total,
      rows: rows.map(r => ({
        customerCode: r.customer_code,
        menuCode: r.menu_code,
        amount: normalizeAmount(r.amount),
      })),
    }
  }
}

function formatMobileForErp(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('966')) return `00${digits}`
  if (digits.startsWith('0')) return `00${digits}`
  return phone
}

function normalizeAmount(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '0'
  const n = parseFloat(trimmed.replace(/,/g, ''))
  if (Number.isNaN(n)) return trimmed
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}
