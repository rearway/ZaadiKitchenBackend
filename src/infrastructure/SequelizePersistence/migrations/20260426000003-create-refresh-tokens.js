'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
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
      token: { type: Sequelize.STRING, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      is_revoked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      user_agent: { type: Sequelize.STRING, allowNull: true },
      ip_address: { type: Sequelize.STRING, allowNull: true },
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

    await queryInterface.addIndex('refresh_tokens', ['token'], {
      name: 'idx_refresh_tokens_token',
      unique: true,
    })
    await queryInterface.addIndex('refresh_tokens', ['user_id', 'is_revoked'], {
      name: 'idx_refresh_tokens_user_revoked',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens')
  },
}
