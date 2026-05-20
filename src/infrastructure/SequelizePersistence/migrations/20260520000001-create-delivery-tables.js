'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. delivery_areas
        await queryInterface.createTable('delivery_areas', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            status: {
                type: Sequelize.ENUM('active', 'coming_soon'),
                allowNull: false,
                defaultValue: 'active',
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

        // 2. buildings
        await queryInterface.createTable('buildings', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            areaId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'delivery_areas',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            floorsCount: {
                type: Sequelize.INTEGER,
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

        // 3. out_of_zone_interests
        await queryInterface.createTable('out_of_zone_interests', {
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
            areaName: {
                type: Sequelize.STRING,
                allowNull: false,
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

        // 4. delivery_locations
        await queryInterface.createTable('delivery_locations', {
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
            areaId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'delivery_areas',
                    key: 'id',
                },
            },
            buildingId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'buildings',
                    key: 'id',
                },
            },
            buildingName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            floor: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            deskArea: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            deliveryPreference: {
                type: Sequelize.ENUM('hand_to_me', 'reception'),
                allowNull: false,
                defaultValue: 'hand_to_me',
            },
            riderNotes: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            isPrimary: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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

        // Add indexes
        await queryInterface.addIndex('buildings', ['areaId'])
        await queryInterface.addIndex('delivery_locations', ['userId'])
        await queryInterface.addIndex('out_of_zone_interests', ['userId'])
    },

    async down(queryInterface) {
        await queryInterface.dropTable('delivery_locations')
        await queryInterface.dropTable('out_of_zone_interests')
        await queryInterface.dropTable('buildings')
        await queryInterface.dropTable('delivery_areas')
    },
}
