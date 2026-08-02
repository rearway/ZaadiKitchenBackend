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
import { BuildingModel } from './BuildingModel.js'

@Table({ tableName: 'delivery_locations', timestamps: true, underscored: true })
export class DeliveryLocationModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => UserModel)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @ForeignKey(() => DeliveryAreaModel)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare areaId: string

  @ForeignKey(() => BuildingModel)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare buildingId: string | null

  @AllowNull(false)
  @Column(DataType.STRING)
  declare buildingName: string

  @AllowNull(true)
  @Column(DataType.STRING)
  declare floor: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare deskArea: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare gate: string | null

  @AllowNull(false)
  @Default('hand_to_me')
  @Column(DataType.ENUM('hand_to_me', 'reception'))
  declare deliveryPreference: 'hand_to_me' | 'reception'

  @AllowNull(true)
  @Column(DataType.STRING)
  declare riderNotes: string | null

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isPrimary: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => UserModel)
  declare user: UserModel

  @BelongsTo(() => DeliveryAreaModel)
  declare area: DeliveryAreaModel

  @BelongsTo(() => BuildingModel)
  declare building: BuildingModel
}
