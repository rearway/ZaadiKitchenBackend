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

@Table({ tableName: 'users', timestamps: true, underscored: true })
export class UserModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(true)
  @Unique
  @Column(DataType.STRING)
  declare phone: string | null

  @AllowNull(true)
  @Unique
  @Column(DataType.STRING)
  declare email: string | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare password: string | null

  @AllowNull(false)
  @Column(DataType.STRING)
  declare fullName: string

  @AllowNull(false)
  @Default('CUSTOMER')
  @Column(DataType.ENUM('CUSTOMER', 'DRIVER', 'ADMIN', 'OPS'))
  declare role: string

  @AllowNull(false)
  @Default('EN')
  @Column(DataType.ENUM('EN', 'AR'))
  declare languagePreference: string

  @AllowNull(true)
  @Column(DataType.STRING)
  declare pushNotificationToken: string | null

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean

  @AllowNull(true)
  @Unique
  @Column(DataType.STRING(20))
  declare referralCode: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
