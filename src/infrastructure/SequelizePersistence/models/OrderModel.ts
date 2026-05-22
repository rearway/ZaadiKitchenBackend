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

@Table({ tableName: 'orders', timestamps: true, underscored: true })
export class OrderModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(true)
  @Column(DataType.UUID)
  declare subscriptionId: string | null

  @AllowNull(false)
  @Column(DataType.UUID)
  declare planId: string

  @AllowNull(true)
  @Column(DataType.UUID)
  declare paymentMethodId: string | null

  @AllowNull(false)
  @Column(DataType.ENUM('executive', 'salad'))
  declare mealType: 'executive' | 'salad'

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare mealCount: number

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare startDate: string

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare planPriceSar: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  declare walletCreditSar: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  declare promoDiscountSar: number

  @AllowNull(true)
  @Column(DataType.STRING(50))
  declare promoCode: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare discountLabel: string | null

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare totalPaidSar: number

  @AllowNull(true)
  @Column(DataType.STRING(20))
  declare paymentMethodType: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare paymentMethodLabel: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare gatewayPaymentId: string | null

  @AllowNull(false)
  @Default('pending')
  @Column(DataType.ENUM('pending', 'confirmed', 'failed'))
  declare status: 'pending' | 'confirmed' | 'failed'

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isNewUser: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
