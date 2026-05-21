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

@Table({ tableName: 'out_of_zone_interests', timestamps: true })
export class OutOfZoneInterestModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => UserModel)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare areaName: string

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date

  @BelongsTo(() => UserModel)
  declare user: UserModel
}
