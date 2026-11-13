'use strict'

/**
 * Adds bilingual labels catalog for envs that already ran 20261030130001.
 * Idempotent — skips if `labels` key already exists.
 * Copy matches src/shared/app-labels.ts.
 */

const LABELS = {
  plans: [
    { key: 'try_it', name_en: 'Try It', name_ar: 'جرّبها' },
    { key: 'week', name_en: 'Week Plan', name_ar: 'الخطة الأسبوعية' },
    { key: 'month', name_en: 'Month Plan', name_ar: 'الخطة الشهرية' },
    { key: 'quarterly', name_en: 'Quarterly', name_ar: 'الخطة الربع سنوية' },
  ],
  wallet: [
    { key: 'admin_credit', name_en: 'Admin Credit', name_ar: 'رصيد من الإدارة' },
    { key: 'referral_reward', name_en: 'Referral reward', name_ar: 'مكافأة الإحالة' },
    { key: 'issue_credit', name_en: 'Issue credit', name_ar: 'رصيد تعويض' },
    { key: 'wallet', name_en: 'Wallet', name_ar: 'المحفظة' },
    { key: 'plan_upgrade', name_en: 'Plan upgrade', name_ar: 'ترقية الخطة' },
    {
      key: 'plan_upgrade_credit',
      name_en: 'Plan upgrade credit',
      name_ar: 'رصيد ترقية الخطة',
    },
  ],
  billing_categories: [
    { key: 'wallet_ledger', name_en: 'Wallet', name_ar: 'المحفظة' },
    {
      key: 'subscription_payment',
      name_en: 'Subscription payment',
      name_ar: 'دفع الاشتراك',
    },
    {
      key: 'referral_reward',
      name_en: 'Referral reward',
      name_ar: 'مكافأة الإحالة',
    },
  ],
  transaction_types: [
    { key: 'credit', name_en: 'Credit', name_ar: 'إضافة' },
    { key: 'debit', name_en: 'Debit', name_ar: 'خصم' },
  ],
  promo: [
    {
      key: 'referral_discount',
      name_en: 'Referral discount',
      name_ar: 'خصم الإحالة',
    },
    {
      key: 'promo_discount',
      name_en: 'Promo discount',
      name_ar: 'خصم ترويجي',
    },
  ],
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date()
    await queryInterface.sequelize.query(
      `INSERT INTO app_settings (key, value, updated_by, updated_at)
       SELECT $1::varchar(64), $2::jsonb, NULL, $3::timestamptz
       WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = $1::varchar(64))`,
      { bind: ['labels', JSON.stringify(LABELS), now] }
    )
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('app_settings', { key: 'labels' })
  },
}
