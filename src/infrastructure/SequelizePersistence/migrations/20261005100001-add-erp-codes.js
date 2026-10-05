'use strict'

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomCode(prefix) {
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return `${prefix}${suffix}`
}

async function assignUniqueCodes(queryInterface, table, column, prefix, whereSql) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM ${table} WHERE ${column} IS NULL ${whereSql}`
  )
  const used = new Set()
  const [existing] = await queryInterface.sequelize.query(
    `SELECT ${column} AS code FROM ${table} WHERE ${column} IS NOT NULL`
  )
  for (const row of existing) {
    if (row.code) used.add(row.code)
  }
  for (const row of rows) {
    let code
    do {
      code = randomCode(prefix)
    } while (used.has(code))
    used.add(code)
    await queryInterface.sequelize.query(
      `UPDATE ${table} SET ${column} = :code WHERE id = :id`,
      { replacements: { code, id: row.id } }
    )
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('meals', 'erp_code', {
      type: Sequelize.STRING(10),
      allowNull: true,
      unique: true,
    })
    await queryInterface.addColumn('users', 'erp_customer_code', {
      type: Sequelize.STRING(10),
      allowNull: true,
      unique: true,
    })

    await assignUniqueCodes(queryInterface, 'meals', 'erp_code', 'M', '')
    await assignUniqueCodes(
      queryInterface,
      'users',
      'erp_customer_code',
      'C',
      "AND role = 'CUSTOMER'"
    )

    await queryInterface.changeColumn('meals', 'erp_code', {
      type: Sequelize.STRING(10),
      allowNull: false,
      unique: true,
    })
    await queryInterface.addIndex('meals', ['erp_code'], {
      name: 'idx_meals_erp_code',
      unique: true,
    })
    await queryInterface.addIndex('users', ['erp_customer_code'], {
      name: 'idx_users_erp_customer_code',
      unique: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_erp_customer_code')
    await queryInterface.removeIndex('meals', 'idx_meals_erp_code')
    await queryInterface.removeColumn('users', 'erp_customer_code')
    await queryInterface.removeColumn('meals', 'erp_code')
  },
}
