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

@Table({ tableName: 'checkout_sessions', timestamps: true, underscored: true })
export class CheckoutSessionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare planId: string

  @AllowNull(false)
  @Column(DataType.ENUM('executive', 'salad'))
  declare mealType: 'executive' | 'salad'

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare basePriceSar: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  declare walletCreditSar: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  declare promoDiscountSar: number

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare totalDueSar: number

  @AllowNull(true)
  @Column(DataType.STRING(50))
  declare promoCode: string | null

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare promoAttemptCount: number

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare promoLocked: boolean

  @AllowNull(false)
  @Default('active')
  @Column(DataType.ENUM('active', 'expired', 'confirmed'))
  declare status: 'active' | 'expired' | 'confirmed'

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
