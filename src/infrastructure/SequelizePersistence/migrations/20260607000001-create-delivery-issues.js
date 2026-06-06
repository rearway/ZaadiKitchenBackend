'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_issues', {
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
        allowNull: false,
      },
      delivery_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      issue_type: {
        type: Sequelize.ENUM('wrong_order', 'quality_issue', 'not_delivered', 'damaged'),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('open', 'credited', 'rejected'),
        allowNull: false,
        defaultValue: 'open',
      },
      credited_amount_sar: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      rejection_reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rejection_notes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('delivery_issues', ['user_id'])
    await queryInterface.addIndex('delivery_issues', ['subscription_id'])
    await queryInterface.addIndex('delivery_issues', ['status'])
    await queryInterface.addIndex('delivery_issues', ['delivery_date'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_issues')
  },
}
