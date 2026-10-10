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
import type { IssueType, IssueStatus } from '../../../core/entities/DeliveryIssue.js'

@Table({ tableName: 'delivery_issues', timestamps: true, underscored: true })
export class DeliveryIssueModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare subscriptionId: string

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare deliveryDate: string

  @AllowNull(false)
  @Column(DataType.ENUM('wrong_order', 'quality_issue', 'not_delivered', 'damaged'))
  declare issueType: IssueType

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare description: string | null

  @AllowNull(false)
  @Default('open')
  @Column(DataType.ENUM('open', 'credited', 'rejected'))
  declare status: IssueStatus

  @AllowNull(true)
  @Column(DataType.DECIMAL(6, 2))
  declare creditedAmountSar: number | null

  @AllowNull(true)
  @Column(DataType.STRING)
  declare rejectionReason: string | null

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare rejectionNotes: string | null

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
