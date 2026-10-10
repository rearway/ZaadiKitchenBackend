'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_ops_days', {
      date: {
        type: Sequelize.DATEONLY,
        primaryKey: true,
        allowNull: false,
      },
      dispatched_at: { type: Sequelize.DATE, allowNull: true },
      dispatched_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      delivered_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_ops_days')
  },
}
