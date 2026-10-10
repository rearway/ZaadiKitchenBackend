'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect()

    if (dialect === 'mysql') {
      await queryInterface.sequelize.query(`
        ALTER DATABASE ${queryInterface.sequelize.config.database}
        CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
      `)

      const tables = await queryInterface.showAllTables()
      for (const table of tables) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        )
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert to default or utf8 if needed (not typically required to roll back charset)
  },
}
