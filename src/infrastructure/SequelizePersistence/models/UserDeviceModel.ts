import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import { UserModel } from './UserModel.js'

@Table({
  tableName: 'user_devices',
  timestamps: true,
  underscored: true,
})
export class UserDeviceModel extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  declare userId: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare platform: 'ios' | 'android'

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare deviceToken: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare endpointArn: string

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare subscriptionArn: string

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare isActive: boolean

  @BelongsTo(() => UserModel)
  declare user: UserModel
}
