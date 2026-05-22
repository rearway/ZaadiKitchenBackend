'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. orders
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'plans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      payment_method_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'payment_methods', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      meal_type: {
        type: Sequelize.ENUM('executive', 'salad'),
        allowNull: false,
      },
      meal_count: { type: Sequelize.INTEGER, allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      plan_price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      wallet_credit_sar: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      promo_discount_sar: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      promo_code: { type: Sequelize.STRING(50), allowNull: true },
      discount_label: { type: Sequelize.STRING, allowNull: true },
      total_paid_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      payment_method_type: { type: Sequelize.STRING(20), allowNull: true },
      payment_method_label: { type: Sequelize.STRING, allowNull: true },
      gateway_payment_id: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      is_new_user: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // 2. subscriptions
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'plans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      meal_type: {
        type: Sequelize.ENUM('executive', 'salad'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      total_meal_days: { type: Sequelize.INTEGER, allowNull: false },
      delivered_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      skipped_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      skip_days_allowed: { type: Sequelize.INTEGER, allowNull: false },
      skip_days_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pause_days_allowed: { type: Sequelize.INTEGER, allowNull: false },
      pause_days_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      paused_from: { type: Sequelize.DATEONLY, allowNull: true },
      paused_until: { type: Sequelize.DATEONLY, allowNull: true },
      pause_ceiling_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // 3. delivery_days
    await queryInterface.createTable('delivery_days', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'subscriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      meal_type: {
        type: Sequelize.ENUM('executive', 'salad'),
        allowNull: false,
      },
      meal_name: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('scheduled', 'skipped', 'delivered', 'past_cutoff', 'paused'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // 4. public_holidays
    await queryInterface.createTable('public_holidays', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      date: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // 5. wallet_transactions
    await queryInterface.createTable('wallet_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      type: {
        type: Sequelize.ENUM('credit', 'debit'),
        allowNull: false,
      },
      amount_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      label: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      reference_id: { type: Sequelize.STRING, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // 6. user_referrals
    await queryInterface.createTable('user_referrals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      referrer_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      referred_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      referral_code: { type: Sequelize.STRING(20), allowNull: false },
      reward_credited_sar: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      is_rewarded: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    })

    // Back-fill orders.subscription_id after subscriptions table exists
    await queryInterface.addColumn('orders', 'subscription_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'subscriptions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })

    // Indexes
    await queryInterface.addIndex('orders', ['user_id'])
    await queryInterface.addIndex('subscriptions', ['user_id'])
    await queryInterface.addIndex('subscriptions', ['user_id', 'status'])
    await queryInterface.addIndex('delivery_days', ['subscription_id'])
    await queryInterface.addIndex('delivery_days', ['subscription_id', 'date'])
    await queryInterface.addIndex('wallet_transactions', ['user_id'])
    await queryInterface.addIndex('user_referrals', ['referrer_user_id'])
    await queryInterface.addIndex('user_referrals', ['referred_user_id'])
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'subscription_id')
    await queryInterface.dropTable('user_referrals')
    await queryInterface.dropTable('wallet_transactions')
    await queryInterface.dropTable('public_holidays')
    await queryInterface.dropTable('delivery_days')
    await queryInterface.dropTable('subscriptions')
    await queryInterface.dropTable('orders')
  },
}
