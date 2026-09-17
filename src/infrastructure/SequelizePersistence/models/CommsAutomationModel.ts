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

@Table({ tableName: 'comms_automations', timestamps: true, underscored: true })
export class CommsAutomationModel extends Model {
  @PrimaryKey
  @Column(DataType.STRING(40))
  declare id: string

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isEnabled: boolean

  @AllowNull(true)
  @Column(DataType.UUID)
  declare updatedByUserId: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
