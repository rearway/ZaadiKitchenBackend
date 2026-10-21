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
  ForeignKey,
} from 'sequelize-typescript'
import { MealModel } from './MealModel.js'

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

  @ForeignKey(() => MealModel)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare selectedMealId: string | null

  @AllowNull(false)
  @Default('scheduled')
  @Column(
    DataType.ENUM('scheduled', 'skipped', 'delivered', 'past_cutoff', 'paused')
  )
  declare status: DeliveryDayStatus

  @AllowNull(true)
  @Column(DataType.DATE)
  declare deliveredAt: Date | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
