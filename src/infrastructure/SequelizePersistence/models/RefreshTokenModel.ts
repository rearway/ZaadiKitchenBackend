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
    declare userId: string

    @AllowNull(false)
    @Column(DataType.STRING)
    declare token: string

    @AllowNull(false)
    @Column(DataType.DATE)
    declare expiresAt: Date

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    declare isRevoked: boolean

    @AllowNull(true)
    @Column(DataType.STRING)
    declare userAgent: string | null

    @AllowNull(true)
    @Column(DataType.STRING)
    declare ipAddress: string | null

    @CreatedAt
    declare createdAt: Date

    @UpdatedAt
    declare updatedAt: Date
}
