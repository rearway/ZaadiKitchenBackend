'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('delivery_days', 'delivered_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })

    await queryInterface.createTable('rider_issues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      delivery_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'delivery_days', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      issue_type: {
        type: Sequelize.ENUM('customer_not_found', 'wrong_address', 'access_denied', 'other'),
        allowNull: false,
      },
      notes: { type: Sequelize.STRING(300), allowNull: true },
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

    await queryInterface.addIndex('rider_issues', ['delivery_day_id'])
    await queryInterface.addIndex('rider_issues', ['rider_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rider_issues')
    await queryInterface.removeColumn('delivery_days', 'delivered_at')
  },
}
