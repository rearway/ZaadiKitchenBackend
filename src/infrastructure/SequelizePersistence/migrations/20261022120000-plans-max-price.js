'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('plans', 'max_price_sar', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('plans', 'max_price_sar')
  },
}
