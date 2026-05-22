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

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired'

@Table({ tableName: 'subscriptions', timestamps: true, underscored: true })
export class SubscriptionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare orderId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare planId: string

  @AllowNull(false)
  @Column(DataType.ENUM('executive', 'salad'))
  declare mealType: 'executive' | 'salad'

  @AllowNull(false)
  @Default('active')
  @Column(DataType.ENUM('active', 'paused', 'cancelled', 'expired'))
  declare status: SubscriptionStatus

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare totalMealDays: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare deliveredCount: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare skippedCount: number

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare startDate: string

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare endDate: string

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare skipDaysAllowed: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare skipDaysUsed: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare pauseDaysAllowed: number

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare pauseDaysUsed: number

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  declare pausedFrom: string | null

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  declare pausedUntil: string | null

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  declare pauseCeilingDate: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
