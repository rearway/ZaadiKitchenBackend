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

@Table({ tableName: 'user_referrals', timestamps: true, underscored: true })
export class UserReferralModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare referrerUserId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare referredUserId: string

  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare referralCode: string

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  declare rewardCreditedSar: number

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isRewarded: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
