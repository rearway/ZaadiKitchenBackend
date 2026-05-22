'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      phone: { type: Sequelize.STRING, allowNull: true, unique: true },
      email: { type: Sequelize.STRING, allowNull: true, unique: true },
      password: { type: Sequelize.STRING, allowNull: true },
      full_name: { type: Sequelize.STRING, allowNull: false },
      role: {
        type: Sequelize.ENUM('CUSTOMER', 'DRIVER', 'ADMIN'),
        allowNull: false,
        defaultValue: 'CUSTOMER',
      },
      language_preference: {
        type: Sequelize.ENUM('EN', 'AR'),
        allowNull: false,
        defaultValue: 'EN',
      },
      push_notification_token: { type: Sequelize.STRING, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
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

    await queryInterface.addIndex('users', ['phone'], {
      name: 'idx_users_phone',
      where: { phone: { [Sequelize.Op.ne]: null } },
    })
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      where: { email: { [Sequelize.Op.ne]: null } },
    })
    await queryInterface.addIndex('users', ['role'], { name: 'idx_users_role' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users')
  },
}
