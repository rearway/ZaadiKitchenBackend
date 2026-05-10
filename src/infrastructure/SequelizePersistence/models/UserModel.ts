import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    AllowNull,
    Unique,
    CreatedAt,
    UpdatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'users', timestamps: true })
export class UserModel extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string

    @AllowNull(true)
    @Unique
    @Column(DataType.STRING)
    phone: string | null

    @AllowNull(true)
    @Unique
    @Column(DataType.STRING)
    email: string | null

    @AllowNull(true)
    @Column(DataType.STRING)
    password: string | null

    @AllowNull(false)
    @Column(DataType.STRING)
    fullName: string

    @AllowNull(false)
    @Default('CUSTOMER')
    @Column(DataType.ENUM('CUSTOMER', 'DRIVER', 'ADMIN'))
    role: string

    @AllowNull(false)
    @Default('EN')
    @Column(DataType.ENUM('EN', 'AR'))
    languagePreference: string

    @AllowNull(true)
    @Column(DataType.STRING)
    pushNotificationToken: string | null

    @AllowNull(false)
    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive: boolean

    @CreatedAt
    declare createdAt: Date

    @UpdatedAt
    declare updatedAt: Date
}
