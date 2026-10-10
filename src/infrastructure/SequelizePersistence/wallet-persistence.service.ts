import { Injectable } from '@nestjs/common'
import { fn, col, literal } from 'sequelize'
import {
  WalletLoader,
  WalletPersistor,
} from '../../core/entitygateway/Wallet.js'
import { WalletTransaction } from '../../core/entities/WalletTransaction.js'
import { WalletTransactionModel } from './models/index.js'

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
