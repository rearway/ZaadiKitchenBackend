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
            phone: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            },
            email: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            fullName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            role: {
                type: Sequelize.ENUM('CUSTOMER', 'DRIVER', 'ADMIN'),
                allowNull: false,
                defaultValue: 'CUSTOMER',
            },
            languagePreference: {
                type: Sequelize.ENUM('EN', 'AR'),
                allowNull: false,
                defaultValue: 'EN',
            },
            pushNotificationToken: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW'),
            },
        })

        // Indexes for common lookups
        await queryInterface.addIndex('users', ['phone'], {
            name: 'idx_users_phone',
            where: { phone: { [Sequelize.Op.ne]: null } },
        })
        await queryInterface.addIndex('users', ['email'], {
            name: 'idx_users_email',
            where: { email: { [Sequelize.Op.ne]: null } },
        })
        await queryInterface.addIndex('users', ['role'], {
            name: 'idx_users_role',
        })
    },

    async down(queryInterface) {
        await queryInterface.dropTable('users')
    },
}
