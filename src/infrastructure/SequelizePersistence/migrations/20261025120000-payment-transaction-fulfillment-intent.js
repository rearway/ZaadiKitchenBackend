'use strict'

/** Checkout intent captured before charge so a paid-but-no-subscription row can be finished. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payment_transactions', 'start_date', {
      type: Sequelize.STRING(10),
      allowNull: true,
    })
    await queryInterface.addColumn('payment_transactions', 'payment_method_id', {
      type: Sequelize.UUID,
      allowNull: true,
    })
    await queryInterface.addIndex('payment_transactions', ['gateway_payment_id'], {
      name: 'payment_transactions_gateway_payment_id_idx',
    })
    await queryInterface.addIndex('payment_transactions', ['checkout_session_id'], {
      name: 'payment_transactions_checkout_session_id_idx',
    })
    await queryInterface.addIndex('payment_transactions', ['status'], {
      name: 'payment_transactions_status_idx',
    })
  },

  down: async queryInterface => {
    await queryInterface.removeIndex(
      'payment_transactions',
      'payment_transactions_status_idx'
    )
    await queryInterface.removeIndex(
      'payment_transactions',
      'payment_transactions_checkout_session_id_idx'
    )
    await queryInterface.removeIndex(
      'payment_transactions',
      'payment_transactions_gateway_payment_id_idx'
    )
    await queryInterface.removeColumn('payment_transactions', 'payment_method_id')
    await queryInterface.removeColumn('payment_transactions', 'start_date')
  },
}
