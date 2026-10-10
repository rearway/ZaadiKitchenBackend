'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    })
    await queryInterface.addIndex('users', ['deleted_at'], {
      name: 'idx_users_deleted_at',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_deleted_at')
    await queryInterface.removeColumn('users', 'deleted_at')
  },
}
