'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      phone: { type: Sequelize.STRING, allowNull: false },
      code: { type: Sequelize.STRING, allowNull: false },
      attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_verified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      locked_until: { type: Sequelize.DATE, allowNull: true },
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

    await queryInterface.addIndex('otp_sessions', ['phone', 'is_verified'], {
      name: 'idx_otp_sessions_phone_verified',
    })
    await queryInterface.addIndex('otp_sessions', ['phone', 'created_at'], {
      name: 'idx_otp_sessions_phone_created',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otp_sessions')
  },
}
