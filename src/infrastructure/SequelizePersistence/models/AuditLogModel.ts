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
import type { AuditLogAction } from '../../../core/entities/AuditLog.js'

@Table({ tableName: 'audit_logs', timestamps: false, underscored: true })
export class AuditLogModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(true)
  @Column(DataType.UUID)
  declare subscriptionId: string | null

  @AllowNull(false)
  @Column(
    DataType.ENUM(
      'skip_delivery',
      'undo_skip_delivery',
      'pause_subscription',
      'resume_subscription',
      'cancel_subscription',
      'expire_subscription'
    )
  )
  declare action: AuditLogAction

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare metadata: Record<string, unknown> | null

  @CreatedAt
  declare createdAt: Date
}
