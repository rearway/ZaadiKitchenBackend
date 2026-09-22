'use strict'

const crypto = require('crypto')

/** Play Store / QA test accounts — pair with OTP_REVIEW_ACCOUNTS in .env */
module.exports = {
  async up(queryInterface) {
    const now = new Date()
    const accounts = [
      {
        phone: '+966500000101',
        full_name: 'Play Store Customer',
        role: 'CUSTOMER',
      },
      {
        phone: '+966500000102',
        full_name: 'Play Store Driver',
        role: 'DRIVER',
      },
    ]

    for (const account of accounts) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE phone = :phone LIMIT 1`,
        { replacements: { phone: account.phone } }
      )
      if (existing.length > 0) {
        await queryInterface.sequelize.query(
          `UPDATE users SET role = :role, full_name = :full_name, is_active = true, updated_at = :now WHERE phone = :phone`,
          {
            replacements: {
              role: account.role,
              full_name: account.full_name,
              phone: account.phone,
              now,
            },
          }
        )
        continue
      }

      await queryInterface.bulkInsert('users', [
        {
          id: crypto.randomUUID(),
          phone: account.phone,
          email: null,
          password: null,
          full_name: account.full_name,
          role: account.role,
          language_preference: 'EN',
          push_notification_token: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ])
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      phone: ['+966500000101', '+966500000102'],
    })
  },
}
