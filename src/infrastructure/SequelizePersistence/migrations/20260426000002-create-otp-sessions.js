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
            phone: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            code: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            attemptCount: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            isVerified: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            lockedUntil: {
                type: Sequelize.DATE,
                allowNull: true,
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

        // Index for phone lookups
        await queryInterface.addIndex('otp_sessions', ['phone', 'isVerified'], {
            name: 'idx_otp_sessions_phone_verified',
        })
        await queryInterface.addIndex('otp_sessions', ['phone', 'createdAt'], {
            name: 'idx_otp_sessions_phone_created',
        })
    },

    async down(queryInterface) {
        await queryInterface.dropTable('otp_sessions')
    },
}
