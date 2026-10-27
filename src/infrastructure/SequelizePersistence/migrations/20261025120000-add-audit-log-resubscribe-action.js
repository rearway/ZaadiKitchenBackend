'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_audit_logs_action" ADD VALUE IF NOT EXISTS 'resubscribe_subscription'`
    )
  },

  async down() {
    console.warn(
      'Rollback: resubscribe_subscription cannot be removed from PostgreSQL ENUM automatically.'
    )
  },
}
