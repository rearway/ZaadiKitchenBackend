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

@Table({ tableName: 'meals', timestamps: true, underscored: true })
export class MealModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.STRING(80))
  declare nameEn: string

  @AllowNull(true)
  @Column(DataType.STRING(80))
  declare nameAr: string | null

  @AllowNull(false)
  @Column(DataType.ENUM('executive', 'salad'))
  declare mealType: 'executive' | 'salad'

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare kcal: number

  @AllowNull(true)
  @Column(DataType.DECIMAL(6, 2))
  declare proteinG: number | null

  @AllowNull(true)
  @Column(DataType.DECIMAL(6, 2))
  declare carbsG: number | null

  @AllowNull(true)
  @Column(DataType.DECIMAL(6, 2))
  declare fatG: number | null

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare chefNote: string | null

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare keyIngredients: string[] | null

  @AllowNull(false)
  @Default('🍛')
  @Column(DataType.STRING(10))
  declare emoji: string

  @AllowNull(false)
  @Default('draft')
  @Column(DataType.ENUM('draft', 'active'))
  declare status: 'draft' | 'active'

  @AllowNull(true)
  @Column(DataType.STRING)
  declare photoUrl: string | null

  @AllowNull(true)
  @Column(DataType.DATE)
  declare activatedAt: Date | null

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  declare lastServed: string | null

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  declare timesServed: number

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
