'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_audit_logs_action" ADD VALUE IF NOT EXISTS 'cancel_pause'`
    )
  },

  async down() {
    console.warn(
      'Rollback: cancel_pause cannot be removed from PostgreSQL ENUM automatically.'
    )
  },
}
