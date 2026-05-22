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

export type DeliveryDayStatus =
  | 'scheduled'
  | 'skipped'
  | 'delivered'
  | 'past_cutoff'
  | 'paused'

@Table({ tableName: 'delivery_days', timestamps: true, underscored: true })
export class DeliveryDayModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare subscriptionId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare date: string

  @AllowNull(false)
  @Column(DataType.ENUM('executive', 'salad'))
  declare mealType: 'executive' | 'salad'

  @AllowNull(true)
  @Column(DataType.STRING)
  declare mealName: string | null

  @AllowNull(false)
  @Default('scheduled')
  @Column(
    DataType.ENUM('scheduled', 'skipped', 'delivered', 'past_cutoff', 'paused')
  )
  declare status: DeliveryDayStatus

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
