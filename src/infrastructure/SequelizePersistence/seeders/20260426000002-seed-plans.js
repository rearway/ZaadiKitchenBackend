'use strict'

const crypto = require('crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM plans WHERE slug IN ('try_it', 'week', 'month', 'quarterly') LIMIT 1`
    )
    if (existing.length > 0) return

    const now = new Date()

    await queryInterface.bulkInsert('plans', [
      {
        id: crypto.randomUUID(),
        name: 'Try It',
        slug: 'try_it',
        price_sar: 28.0,
        meal_count: 1,
        price_per_meal_sar: 28.0,
        skip_days_allowed: 1,
        pause_days_allowed: 1,
        is_most_popular: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Week Plan',
        slug: 'week',
        price_sar: 125.0,
        meal_count: 5,
        price_per_meal_sar: 25.0,
        skip_days_allowed: 15,
        pause_days_allowed: 15,
        is_most_popular: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Month Plan',
        slug: 'month',
        price_sar: 500.0,
        meal_count: 22,
        price_per_meal_sar: 22.7,
        skip_days_allowed: 66,
        pause_days_allowed: 66,
        is_most_popular: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'Quarterly',
        slug: 'quarterly',
        price_sar: 1300.0,
        meal_count: 66,
        price_per_meal_sar: 19.7,
        skip_days_allowed: 198,
        pause_days_allowed: 198,
        is_most_popular: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('plans', {
      slug: ['try_it', 'week', 'month', 'quarterly'],
    })
  },
}
