'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('meals', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addIndex('meals', ['deleted_at'], {
      name: 'idx_meals_deleted_at',
    })

    await queryInterface.addColumn('delivery_areas', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addIndex('delivery_areas', ['deleted_at'], {
      name: 'idx_delivery_areas_deleted_at',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'delivery_areas',
      'idx_delivery_areas_deleted_at'
    )
    await queryInterface.removeColumn('delivery_areas', 'deleted_at')
    await queryInterface.removeIndex('meals', 'idx_meals_deleted_at')
    await queryInterface.removeColumn('meals', 'deleted_at')
  },
}
