'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'referral_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    })
    await queryInterface.addIndex('users', ['referral_code'])
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'referral_code')
  },
}
