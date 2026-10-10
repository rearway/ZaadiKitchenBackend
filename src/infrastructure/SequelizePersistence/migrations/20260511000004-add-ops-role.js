'use strict'

/**
 * Migration: Add OPS role to users table enum
 *
 * PostgreSQL ENUM types cannot be modified directly via ALTER TABLE.
 * The correct approach is to use ALTER TYPE to add the new value.
 * The down migration renames the type back — note that removing
 * an ENUM value from Postgres requires recreating the type entirely,
 * so the rollback leaves OPS in place but documents the intent.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        // Add 'OPS' to the existing enum type used by users.role
        await queryInterface.sequelize.query(
            `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'OPS'`
        )
    },

    async down(queryInterface) {
        // PostgreSQL does not support removing a value from an ENUM type.
        // To fully roll back, you would need to:
        //   1. Change all 'OPS' users to another role
        //   2. Recreate the enum without 'OPS'
        //   3. Update the column to use the new type
        // This is intentionally left as a no-op to avoid data loss.
        console.warn(
            'Rollback: OPS value cannot be removed from PostgreSQL ENUM automatically. ' +
            'Manually migrate OPS users before dropping the value.'
        )
    },
}
