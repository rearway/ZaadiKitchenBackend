'use strict'

/**
 * Placeholder app settings. Internal meal slugs stay `executive` and `salad`.
 * Display copy matches src/shared/meal-display.ts and
 * src/core/usecases/services/appSettingsPayload.ts.
 */

const MEAL_TYPES = [
  {
    slug: 'executive',
    name_en: 'Platio Balanced',
    name_ar: 'Platio متوازن',
    short_en: 'Balanced',
    short_ar: 'متوازن',
    sort: 1,
  },
  {
    slug: 'salad',
    name_en: 'Platio Light',
    name_ar: 'Platio لايت',
    short_en: 'Light',
    short_ar: 'لايت',
    sort: 2,
  },
]

const APP_VERSIONS = {
  ios: {
    min: '1.0.0',
    latest: '1.0.0',
    store_url: 'https://apps.apple.com/app/id0000000000',
  },
  android: {
    min: '1.0.0',
    latest: '1.0.0',
    store_url:
      'https://play.google.com/store/apps/details?id=com.platio.placeholder',
  },
}

const SUPPORT = {
  whatsapp: '+966500000000',
  email: 'support@platio.example',
  phone: '+966500000000',
}

const ORDERING = {
  cutoff_local_time: '18:00',
  timezone: 'Asia/Riyadh',
  working_days: ['sun', 'mon', 'tue', 'wed', 'thu'],
}

const FEATURE_FLAGS = {
  menu_day_picker: true,
  referrals: true,
}

const ROWS = [
  ['meal_types', MEAL_TYPES],
  ['app_versions', APP_VERSIONS],
  ['support', SUPPORT],
  ['ordering', ORDERING],
  ['feature_flags', FEATURE_FLAGS],
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date()
    for (const [key, value] of ROWS) {
      await queryInterface.sequelize.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
         SELECT $1::varchar(64), $2::jsonb, NULL, $3::timestamptz
         WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = $1::varchar(64))`,
        { bind: [key, JSON.stringify(value), now] }
      )
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('app_settings', {
      key: ROWS.map(([key]) => key),
    })
  },
}
