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

export type PaymentMethodType =
  | 'mada'
  | 'apple_pay'
  | 'visa'
  | 'mastercard'
  | 'stc_pay'

@Table({ tableName: 'payment_methods', timestamps: true, underscored: true })
export class PaymentMethodModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string

  @AllowNull(false)
  @Column(DataType.ENUM('mada', 'apple_pay', 'visa', 'mastercard', 'stc_pay'))
  declare type: PaymentMethodType

  @AllowNull(false)
  @Column(DataType.STRING)
  declare label: string

  @AllowNull(false)
  @Column(DataType.STRING)
  declare token: string

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isDefault: boolean

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isLastUsed: boolean

  @CreatedAt
  declare createdAt: Date

  @UpdatedAt
  declare updatedAt: Date
}
