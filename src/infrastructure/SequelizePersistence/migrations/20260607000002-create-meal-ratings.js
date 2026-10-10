'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meal_ratings', {
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
      delivery_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      meal_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      delivery_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      stars: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
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

    await queryInterface.addIndex('meal_ratings', ['user_id'])
    await queryInterface.addIndex('meal_ratings', ['subscription_id'])
    await queryInterface.addIndex('meal_ratings', ['meal_id'])
    // Unique constraint: one rating per delivery day per user
    await queryInterface.addIndex('meal_ratings', ['user_id', 'delivery_day_id'], {
      unique: true,
      name: 'meal_ratings_user_delivery_day_unique',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meal_ratings')
  },
}
