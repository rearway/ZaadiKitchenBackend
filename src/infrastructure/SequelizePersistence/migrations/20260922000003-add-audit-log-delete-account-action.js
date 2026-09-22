'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_audit_logs_action" ADD VALUE IF NOT EXISTS 'delete_account'`
    )
  },

  async down() {
    console.warn(
      'Rollback: delete_account cannot be removed from PostgreSQL ENUM automatically.'
    )
  },
}
