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
import { RatingTag } from '../../../core/entities/MealRating.js'

@Table({ tableName: 'meal_ratings', timestamps: true, underscored: true })
export class MealRatingModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare subscriptionId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare deliveryDayId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare mealId: string

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare deliveryDate: string

  @AllowNull(false)
  @Column(DataType.SMALLINT)
  declare stars: number

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  declare tags: RatingTag[]

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
