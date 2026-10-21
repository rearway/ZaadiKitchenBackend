'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('otp_sessions', 'channel', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'sms',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('otp_sessions', 'channel')
  },
}
