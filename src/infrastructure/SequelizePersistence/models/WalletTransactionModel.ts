import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'wallet_transactions', timestamps: true, underscored: true })
export class WalletTransactionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.ENUM('credit', 'debit'))
  declare type: 'credit' | 'debit'

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare amountSar: number

  @AllowNull(false)
  @Column(DataType.STRING)
  declare label: string

  @AllowNull(true)
  @Column(DataType.STRING)
  declare description: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare referenceId: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
