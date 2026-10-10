import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'promo_codes', timestamps: true, underscored: true })
export class PromoCodeModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(50))
  declare code: string

  @AllowNull(false)
  @Default('promo')
  @Column(DataType.ENUM('referral', 'promo'))
  declare type: 'referral' | 'promo'

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare discountSar: number

  @AllowNull(true)
  @Column(DataType.UUID)
  declare ownerUserId: string | null

  @AllowNull(true)
  @Column(DataType.STRING(30))
  declare validForPlanSlug: string | null

  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare maxUses: number | null

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare timesUsed: number

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
