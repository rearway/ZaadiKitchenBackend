'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('driver_area_assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      driver_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      area_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'delivery_areas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('driver_area_assignments', ['driver_id', 'area_id'], {
      unique: true,
      name: 'driver_area_assignments_driver_id_area_id_uk',
    })
    await queryInterface.addIndex('driver_area_assignments', ['area_id'], {
      name: 'idx_driver_area_assignments_area_id',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('driver_area_assignments')
  },
}
