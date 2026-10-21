'use strict'

/**
 * Meal options stage 0:
 * - Allow more than one executive/salad slot per day
 * - Mark one default dish per stream/day
 * - Store the customer's selected dish on delivery_days
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      'menu_slots',
      'uq_menu_slots_week_date_type'
    )

    await queryInterface.addColumn('menu_slots', 'is_default', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    })

    await queryInterface.sequelize.query(`
      UPDATE menu_slots
      SET is_default = true
      WHERE meal_id IS NOT NULL
    `)

    await queryInterface.addIndex('menu_slots', {
      fields: ['week_id', 'delivery_date', 'meal_type'],
      unique: true,
      name: 'uq_menu_slots_default_per_day_type',
      where: { is_default: true },
    })

    await queryInterface.addColumn('delivery_days', 'selected_meal_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'meals', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })

    await queryInterface.addIndex('delivery_days', ['selected_meal_id'], {
      name: 'idx_delivery_days_selected_meal_id',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'delivery_days',
      'idx_delivery_days_selected_meal_id'
    )
    await queryInterface.removeColumn('delivery_days', 'selected_meal_id')
    await queryInterface.removeIndex(
      'menu_slots',
      'uq_menu_slots_default_per_day_type'
    )
    await queryInterface.removeColumn('menu_slots', 'is_default')
    await queryInterface.addConstraint('menu_slots', {
      fields: ['week_id', 'delivery_date', 'meal_type'],
      type: 'unique',
      name: 'uq_menu_slots_week_date_type',
    })
  },
}
