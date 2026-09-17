import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'comms_broadcasts', timestamps: true, updatedAt: false, underscored: true })
export class CommsBroadcastModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.STRING(40))
  declare segmentId: string

  @AllowNull(false)
  @Column(DataType.STRING(200))
  declare message: string

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare recipientCount: number

  @AllowNull(false)
  @Column(DataType.UUID)
  declare sentByUserId: string

  @AllowNull(false)
  @Default('sent')
  @Column(DataType.STRING(20))
  declare status: 'sent'

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare sentAt: Date

  @CreatedAt
  declare createdAt: Date
}
