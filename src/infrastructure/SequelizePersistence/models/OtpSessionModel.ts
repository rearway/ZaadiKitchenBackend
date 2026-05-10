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

@Table({ tableName: 'otp_sessions', timestamps: true })
export class OtpSessionModel extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string

    @AllowNull(false)
    @Column(DataType.STRING)
    phone: string

    @AllowNull(false)
    @Column(DataType.STRING)
    code: string

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    attemptCount: number

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isVerified: boolean

    @AllowNull(false)
    @Column(DataType.DATE)
    expiresAt: Date

    @AllowNull(true)
    @Column(DataType.DATE)
    lockedUntil: Date | null

    @CreatedAt
    declare createdAt: Date

    @UpdatedAt
    declare updatedAt: Date
}
