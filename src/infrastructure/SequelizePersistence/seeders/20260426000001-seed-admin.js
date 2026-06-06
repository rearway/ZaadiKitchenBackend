'use strict'

const bcrypt = require('bcrypt')
const crypto = require('crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@zaadikitchen.com' LIMIT 1`
    )
    if (existing.length > 0) return

    const hashedPassword = await bcrypt.hash('Admin@123', 10)

    await queryInterface.bulkInsert('users', [
      {
        id: crypto.randomUUID(),
        phone: null,
        email: 'admin@zaadikitchen.com',
        password: hashedPassword,
        full_name: 'Zaadi Admin',
        role: 'ADMIN',
        language_preference: 'EN',
        push_notification_token: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@zaadikitchen.com',
    })
  },
}
