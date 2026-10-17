'use strict'

/**
 * Meals: add `updated` status and pending_changes JSONB.
 * Edits to an active meal are stored as pending until admin re-activates.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_meals_status" ADD VALUE IF NOT EXISTS 'updated'`
    )

    await queryInterface.addColumn('meals', 'pending_changes', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('meals', 'pending_changes')
    console.warn(
      "Rollback: 'updated' cannot be removed from PostgreSQL ENUM automatically."
    )
  },
}
