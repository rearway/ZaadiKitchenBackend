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

@Table({ tableName: 'plans', timestamps: true, underscored: true })
export class PlanModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(30))
  declare slug: string

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare priceSar: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare mealCount: number

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare pricePerMealSar: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare skipDaysAllowed: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare pauseDaysAllowed: number

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isMostPopular: boolean

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
