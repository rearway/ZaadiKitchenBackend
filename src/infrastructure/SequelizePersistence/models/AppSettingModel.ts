import { Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript'

@Table({ tableName: 'app_settings', timestamps: false, underscored: true })
export class AppSettingModel extends Model {
  @PrimaryKey
  @Column(DataType.STRING(64))
  declare key: string

  @Column(DataType.JSONB)
  declare value: unknown

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  declare updatedBy: string | null

  @Column({ type: DataType.DATE, allowNull: false, field: 'updated_at' })
  declare updatedAt: Date
}
