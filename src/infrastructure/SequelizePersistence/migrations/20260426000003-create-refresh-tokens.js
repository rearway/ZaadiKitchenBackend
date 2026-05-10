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
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            token: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            isRevoked: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            userAgent: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            ipAddress: {
                type: Sequelize.STRING,
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

        // Indexes
        await queryInterface.addIndex('refresh_tokens', ['token'], {
            name: 'idx_refresh_tokens_token',
            unique: true,
        })
        await queryInterface.addIndex('refresh_tokens', ['userId', 'isRevoked'], {
            name: 'idx_refresh_tokens_user_revoked',
        })
    },

    async down(queryInterface) {
        await queryInterface.dropTable('refresh_tokens')
    },
}
