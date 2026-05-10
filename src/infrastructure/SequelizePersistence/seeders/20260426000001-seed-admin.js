'use strict'

const bcrypt = require('bcrypt')
const crypto = require('crypto')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const hashedPassword = await bcrypt.hash('Admin@123', 10)

        await queryInterface.bulkInsert('users', [
            {
                id: crypto.randomUUID(),
                phone: null,
                email: 'admin@zaadikitchen.com',
                password: hashedPassword,
                fullName: 'Zaadi Admin',
                role: 'ADMIN',
                languagePreference: 'EN',
                pushNotificationToken: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ])
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('users', {
            email: 'admin@zaadikitchen.com',
        })
    },
}
