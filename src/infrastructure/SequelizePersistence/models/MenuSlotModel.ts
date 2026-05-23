import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript'
import { MealModel } from './MealModel.js'
import { MenuWeekModel } from './MenuWeekModel.js'

@Table({ tableName: 'menu_slots', timestamps: true, underscored: true })
export class MenuSlotModel extends Model {
  @PrimaryKey
  @Column(DataType.STRING(50))
  declare id: string  // e.g. 'slot_w2025-19_sun_exec'

  @ForeignKey(() => MenuWeekModel)
  @AllowNull(false)
  @Column(DataType.STRING(20))
  declare weekId: string

  @BelongsTo(() => MenuWeekModel, { foreignKey: 'weekId', as: 'MenuWeek' })
  declare MenuWeek?: MenuWeekModel

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare deliveryDate: string

  @AllowNull(false)
  @Column(DataType.ENUM('executive', 'salad'))
  declare mealType: 'executive' | 'salad'

  @ForeignKey(() => MealModel)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare mealId: string | null

  @BelongsTo(() => MealModel, { foreignKey: 'mealId', as: 'Meal' })
  declare Meal?: MealModel

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
