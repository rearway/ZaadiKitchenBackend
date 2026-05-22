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

@Table({ tableName: 'delivery_areas', timestamps: true, underscored: true })
export class DeliveryAreaModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string

  @AllowNull(true)
  @Column(DataType.STRING)
  declare description: string | null

  @AllowNull(false)
  @Default('active')
  @Column(DataType.ENUM('active', 'coming_soon', 'paused'))
  declare status: 'active' | 'coming_soon' | 'paused'

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
