'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('checkout_sessions', 'promotion_subscription_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'subscriptions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })
    await queryInterface.addColumn('checkout_sessions', 'prior_plan_credit_sar', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('checkout_sessions', 'prior_plan_credit_sar')
    await queryInterface.removeColumn('checkout_sessions', 'promotion_subscription_id')
  },
}
