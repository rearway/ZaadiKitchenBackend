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
import type { RiderIssueType } from '../../../core/entities/RiderIssue.js'

@Table({ tableName: 'rider_issues', timestamps: true, underscored: true })
export class RiderIssueModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare deliveryDayId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare riderId: string

  @AllowNull(false)
  @Column(DataType.ENUM('customer_not_found', 'wrong_address', 'access_denied', 'other'))
  declare issueType: RiderIssueType

  @AllowNull(true)
  @Column(DataType.STRING(300))
  declare notes: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
