import { IsString, IsNotEmpty, IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AdminLoginDTO {
    @ApiProperty({
        description: 'Admin email address',
        example: 'admin@zaadikitchen.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty({
        description: 'Admin password',
        example: 'Admin@123',
    })
    @IsString()
    @IsNotEmpty()
    password: string
}
