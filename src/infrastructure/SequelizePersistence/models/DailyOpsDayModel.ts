import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'daily_ops_days', timestamps: true, underscored: true })
export class DailyOpsDayModel extends Model {
  @PrimaryKey
  @Column(DataType.DATEONLY)
  declare date: string

  @AllowNull(true)
  @Column(DataType.DATE)
  declare dispatchedAt: Date | null

  @AllowNull(true)
  @Column(DataType.UUID)
  declare dispatchedBy: string | null

  @AllowNull(true)
  @Column(DataType.DATE)
  declare deliveredAt: Date | null

  @AllowNull(true)
  @Column(DataType.UUID)
  declare deliveredBy: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
