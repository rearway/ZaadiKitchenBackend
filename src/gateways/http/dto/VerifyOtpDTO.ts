import {
    IsString,
    IsNotEmpty,
    Matches,
    IsEnum,
    IsOptional,
    Length,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '../../../codecs/enums'

export class VerifyOtpDTO {
    @ApiProperty({
        description: 'Phone number in Saudi format (+966XXXXXXXXX)',
        example: '+966500000000',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+966[0-9]{9}$/, {
        message: 'Phone must be in Saudi format: +966XXXXXXXXX',
    })
    phone: string

    @ApiProperty({
        description: '6-digit OTP code',
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
    code: string

    @ApiProperty({
        description: 'User role (CUSTOMER or DRIVER)',
        enum: [UserRole.CUSTOMER, UserRole.DRIVER],
        example: UserRole.CUSTOMER,
    })
    @IsEnum([UserRole.CUSTOMER, UserRole.DRIVER], {
        message: 'Role must be CUSTOMER or DRIVER',
    })
    role: UserRole.CUSTOMER | UserRole.DRIVER

    @ApiPropertyOptional({
        description: 'Full name (required for new users)',
        example: 'Mohammed Ali',
    })
    @IsOptional()
    @IsString()
    fullName?: string
}
