import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript'
import { UserModel } from './UserModel.js'
import { CheckoutSessionModel } from './CheckoutSessionModel.js'

@Table({
  tableName: 'payment_transactions',
  timestamps: true,
  underscored: true,
})
export class PaymentTransactionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string

  @ForeignKey(() => CheckoutSessionModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare checkoutSessionId: string

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    get() {
      const val = this.getDataValue('amountSar')
      return val ? parseFloat(val as unknown as string) : val
    },
  })
  declare amountSar: number

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'INITIATED',
  })
  declare status: 'INITIATED' | 'SUCCESS' | 'FAILED'

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare gatewayPaymentId: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
