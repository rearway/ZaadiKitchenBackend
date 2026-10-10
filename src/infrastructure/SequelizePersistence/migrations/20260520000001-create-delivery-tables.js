'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. delivery_areas
    await queryInterface.createTable('delivery_areas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'coming_soon', 'paused'),
        allowNull: false,
        defaultValue: 'active',
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

    // 2. buildings
    await queryInterface.createTable('buildings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      area_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'delivery_areas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING, allowNull: false },
      floors_count: { type: Sequelize.INTEGER, allowNull: true },
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

    // 3. out_of_zone_interests
    await queryInterface.createTable('out_of_zone_interests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      area_name: { type: Sequelize.STRING, allowNull: false },
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

    // 4. delivery_locations
    await queryInterface.createTable('delivery_locations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
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
      },
      building_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'buildings', key: 'id' },
      },
      building_name: { type: Sequelize.STRING, allowNull: false },
      floor: { type: Sequelize.STRING, allowNull: true },
      desk_area: { type: Sequelize.STRING, allowNull: true },
      delivery_preference: {
        type: Sequelize.ENUM('hand_to_me', 'reception'),
        allowNull: false,
        defaultValue: 'hand_to_me',
      },
      rider_notes: { type: Sequelize.STRING, allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
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

    await queryInterface.addIndex('buildings', ['area_id'])
    await queryInterface.addIndex('delivery_locations', ['user_id'])
    await queryInterface.addIndex('out_of_zone_interests', ['user_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_locations')
    await queryInterface.dropTable('out_of_zone_interests')
    await queryInterface.dropTable('buildings')
    await queryInterface.dropTable('delivery_areas')
  },
}
