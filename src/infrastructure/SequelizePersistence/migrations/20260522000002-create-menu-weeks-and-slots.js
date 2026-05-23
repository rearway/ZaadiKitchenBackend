'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menu_weeks', {
      id: {
        type: Sequelize.STRING(20),
        primaryKey: true,
        allowNull: false,
      },
      week_number: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      date_from: { type: Sequelize.DATEONLY, allowNull: false },
      date_to: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'past'),
        allowNull: false,
        defaultValue: 'draft',
      },
      published_at: { type: Sequelize.DATE, allowNull: true },
      published_by: {
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

    await queryInterface.addIndex('menu_weeks', ['year', 'week_number'])
    await queryInterface.addIndex('menu_weeks', ['date_from'])
    await queryInterface.addIndex('menu_weeks', ['status'])

    await queryInterface.createTable('menu_slots', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false,
      },
      week_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: { model: 'menu_weeks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      delivery_date: { type: Sequelize.DATEONLY, allowNull: false },
      meal_type: {
        type: Sequelize.ENUM('executive', 'salad'),
        allowNull: false,
      },
      meal_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'meals', key: 'id' },
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

    await queryInterface.addIndex('menu_slots', ['week_id'])
    await queryInterface.addIndex('menu_slots', ['delivery_date'])
    await queryInterface.addIndex('menu_slots', ['meal_id'])
    await queryInterface.addConstraint('menu_slots', {
      fields: ['week_id', 'delivery_date', 'meal_type'],
      type: 'unique',
      name: 'uq_menu_slots_week_date_type',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('menu_slots')
    await queryInterface.dropTable('menu_weeks')
  },
}
