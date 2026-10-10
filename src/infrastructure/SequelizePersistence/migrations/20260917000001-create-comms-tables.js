'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comms_automations', {
      id: {
        type: Sequelize.STRING(40),
        primaryKey: true,
        allowNull: false,
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      updated_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    })

    await queryInterface.createTable('comms_broadcasts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      segment_id: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      message: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      recipient_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sent_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'sent',
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    })

    const now = new Date()
    await queryInterface.bulkInsert('comms_automations', [
      { id: 'delivery_confirmed', is_enabled: true, created_at: now, updated_at: now },
      { id: 'eod_feedback', is_enabled: true, created_at: now, updated_at: now },
      { id: 'renewal_reminder', is_enabled: true, created_at: now, updated_at: now },
      { id: 'referral_reward', is_enabled: true, created_at: now, updated_at: now },
      { id: 'lapsed_reactivation', is_enabled: false, created_at: now, updated_at: now },
    ])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comms_broadcasts')
    await queryInterface.dropTable('comms_automations')
  },
}
