import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    AllowNull,
    ForeignKey,
    CreatedAt,
    UpdatedAt,
} from 'sequelize-typescript'
import { UserModel } from './UserModel'

@Table({ tableName: 'refresh_tokens', timestamps: true })
export class RefreshTokenModel extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string

    @AllowNull(false)
    @ForeignKey(() => UserModel)
    @Column(DataType.UUID)
    userId: string

    @AllowNull(false)
    @Column(DataType.STRING)
    token: string

    @AllowNull(false)
    @Column(DataType.DATE)
    expiresAt: Date

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    isRevoked: boolean

    @AllowNull(true)
    @Column(DataType.STRING)
    userAgent: string | null

    @AllowNull(true)
    @Column(DataType.STRING)
    ipAddress: string | null

    @CreatedAt
    declare createdAt: Date

    @UpdatedAt
    declare updatedAt: Date
}
