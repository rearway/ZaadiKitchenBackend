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
import { UserModel } from './UserModel.js'
import { DeliveryAreaModel } from './DeliveryAreaModel.js'

@Table({
  tableName: 'driver_area_assignments',
  timestamps: true,
  underscored: true,
})
export class DriverAreaAssignmentModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => UserModel)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare driverId: string

  @ForeignKey(() => DeliveryAreaModel)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare areaId: string

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => UserModel)
  declare driver: UserModel

  @BelongsTo(() => DeliveryAreaModel)
  declare area: DeliveryAreaModel
}
