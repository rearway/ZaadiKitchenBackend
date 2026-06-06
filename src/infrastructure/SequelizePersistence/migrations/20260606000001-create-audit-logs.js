'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      action: {
        type: Sequelize.ENUM(
          'skip_delivery',
          'undo_skip_delivery',
          'pause_subscription',
          'resume_subscription',
          'cancel_subscription',
          'expire_subscription'
        ),
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    })

    await queryInterface.addIndex('audit_logs', ['user_id'])
    await queryInterface.addIndex('audit_logs', ['subscription_id'])
    await queryInterface.addIndex('audit_logs', ['action'])
    await queryInterface.addIndex('audit_logs', ['created_at'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs')
  },
}
