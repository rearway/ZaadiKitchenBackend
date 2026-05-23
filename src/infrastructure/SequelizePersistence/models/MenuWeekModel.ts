import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'menu_weeks', timestamps: true, underscored: true })
export class MenuWeekModel extends Model {
  @PrimaryKey
  @Column(DataType.STRING(20))
  declare id: string  // e.g. 'w2025-19'

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare weekNumber: number

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare year: number

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare dateFrom: string

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare dateTo: string

  @AllowNull(false)
  @Default('draft')
  @Column(DataType.ENUM('draft', 'published', 'past'))
  declare status: 'draft' | 'published' | 'past'

  @AllowNull(true)
  @Column(DataType.DATE)
  declare publishedAt: Date | null

  @AllowNull(true)
  @Column(DataType.UUID)
  declare publishedBy: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
