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
  BelongsTo,
} from 'sequelize-typescript'
import { DeliveryAreaModel } from './DeliveryAreaModel.js'

@Table({ tableName: 'buildings', timestamps: true })
export class BuildingModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => DeliveryAreaModel)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare areaId: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string

  @AllowNull(true)
  @Column(DataType.INTEGER)
  declare floorsCount: number | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => DeliveryAreaModel)
  declare area: DeliveryAreaModel
}
