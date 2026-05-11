import {
    IsString,
    IsNotEmpty,
    Matches,
    IsOptional,
    Length,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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

    @ApiPropertyOptional({
        description: 'Full name — only required for new customer registrations',
        example: 'Mohammed Ali',
    })
    @IsOptional()
    @IsString()
    fullName?: string
}
