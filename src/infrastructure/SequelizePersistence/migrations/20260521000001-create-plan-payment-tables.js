'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. plans
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      meal_count: { type: Sequelize.INTEGER, allowNull: false },
      price_per_meal_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      skip_days_allowed: { type: Sequelize.INTEGER, allowNull: false },
      pause_days_allowed: { type: Sequelize.INTEGER, allowNull: false },
      is_most_popular: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // 2. promo_codes
    await queryInterface.createTable('promo_codes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      type: {
        type: Sequelize.ENUM('referral', 'promo'),
        allowNull: false,
        defaultValue: 'promo',
      },
      discount_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      owner_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      valid_for_plan_slug: { type: Sequelize.STRING(30), allowNull: true },
      max_uses: { type: Sequelize.INTEGER, allowNull: true },
      times_used: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // 3. checkout_sessions
    await queryInterface.createTable('checkout_sessions', {
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
        onDelete: 'CASCADE',
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
      base_price_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
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
      total_due_sar: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      promo_code: { type: Sequelize.STRING(50), allowNull: true },
      promo_attempt_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      promo_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'confirmed'),
        allowNull: false,
        defaultValue: 'active',
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
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

    // 4. payment_methods
    await queryInterface.createTable('payment_methods', {
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
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('mada', 'apple_pay', 'visa', 'mastercard', 'stc_pay'),
        allowNull: false,
      },
      label: { type: Sequelize.STRING, allowNull: false },
      token: { type: Sequelize.STRING, allowNull: false },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_last_used: {
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

    await queryInterface.addIndex('checkout_sessions', ['user_id'])
    await queryInterface.addIndex('checkout_sessions', ['user_id', 'status'])
    await queryInterface.addIndex('payment_methods', ['user_id'])
    await queryInterface.addIndex('promo_codes', ['code'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('checkout_sessions')
    await queryInterface.dropTable('payment_methods')
    await queryInterface.dropTable('promo_codes')
    await queryInterface.dropTable('plans')
  },
}
