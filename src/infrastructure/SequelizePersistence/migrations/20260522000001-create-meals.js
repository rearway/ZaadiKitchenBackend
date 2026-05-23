'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name_en: { type: Sequelize.STRING(80), allowNull: false },
      name_ar: { type: Sequelize.STRING(80), allowNull: true },
      meal_type: {
        type: Sequelize.ENUM('executive', 'salad'),
        allowNull: false,
      },
      kcal: { type: Sequelize.INTEGER, allowNull: false },
      protein_g: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      carbs_g: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      fat_g: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      chef_note: { type: Sequelize.TEXT, allowNull: true },
      key_ingredients: { type: Sequelize.JSONB, allowNull: true },
      emoji: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: '🍛',
      },
      status: {
        type: Sequelize.ENUM('draft', 'active'),
        allowNull: false,
        defaultValue: 'draft',
      },
      photo_url: { type: Sequelize.STRING, allowNull: true },
      activated_at: { type: Sequelize.DATE, allowNull: true },
      last_served: { type: Sequelize.DATEONLY, allowNull: true },
      times_served: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('meals', ['status'])
    await queryInterface.addIndex('meals', ['meal_type', 'status'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meals')
  },
}
