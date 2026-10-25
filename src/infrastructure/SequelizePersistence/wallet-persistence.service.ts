import { Injectable } from '@nestjs/common'
import { fn, col, literal } from 'sequelize'
import {
  WalletLoader,
  WalletPersistor,
} from '../../core/entitygateway/Wallet.js'
import { WalletTransaction } from '../../core/entities/WalletTransaction.js'
import { WalletTransactionModel } from './models/index.js'
import { walletCoversDebit } from '../../core/constants/payment-status.js'
import { InsufficientWalletBalanceError } from '../../shared/errors/index.js'

@Injectable()
export class WalletPersistenceService implements WalletLoader, WalletPersistor {
  async getBalanceByUserId(userId: string): Promise<number> {
    const result = await WalletTransactionModel.findOne({
      where: { userId },
      attributes: [
        [fn('COALESCE', fn('SUM', col('amount_sar')), literal('0')), 'balance'],
      ],
      raw: true,
    })
    const raw = result as unknown as { balance: string }
    return Number(raw?.balance ?? 0)
  }

  async getTransactionsByUserId(
    userId: string,
    pagination: { page: number; perPage: number }
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.perPage
    const { rows, count } = await WalletTransactionModel.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: pagination.perPage,
      offset,
    })
    return {
      transactions: rows.map(m => this.toEntity(m)),
      total: count,
    }
  }

  async createTransaction(
    input: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WalletTransaction> {
    const model = await WalletTransactionModel.create({ ...input })
    return this.toEntity(model)
  }

  async createDebitIfSufficient(
    input: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WalletTransaction> {
    if (input.type !== 'debit') {
      throw new Error('createDebitIfSufficient requires a debit')
    }
    const sequelize = WalletTransactionModel.sequelize
    if (!sequelize) throw new Error('Database not initialized')
    const debitSar = Math.abs(input.amountSar)

    return sequelize.transaction(async transaction => {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:userId))', {
        replacements: { userId: input.userId },
        transaction,
      })

      if (input.referenceId) {
        const existing = await WalletTransactionModel.findOne({
          where: {
            userId: input.userId,
            referenceId: input.referenceId,
            type: 'debit',
          },
          transaction,
        })
        if (existing) return this.toEntity(existing)
      }

      const result = await WalletTransactionModel.findOne({
        where: { userId: input.userId },
        attributes: [
          [
            fn('COALESCE', fn('SUM', col('amount_sar')), literal('0')),
            'balance',
          ],
        ],
        raw: true,
        transaction,
      })
      const raw = result as unknown as { balance: string }
      const balance = Number(raw?.balance ?? 0)
      if (!walletCoversDebit(balance, debitSar)) {
        throw new InsufficientWalletBalanceError()
      }

      const model = await WalletTransactionModel.create(
        { ...input, type: 'debit', amountSar: -debitSar },
        { transaction }
      )
      return this.toEntity(model)
    })
  }

  private toEntity(model: WalletTransactionModel): WalletTransaction {
    return {
      id: model.id,
      userId: model.userId,
      type: model.type,
      amountSar: Number(model.amountSar),
      label: model.label,
      description: model.description,
      referenceId: model.referenceId,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
