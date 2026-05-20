import { IsString, IsOptional, Length, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateProfileDTO {
    @ApiPropertyOptional({
        description: 'Full name',
        example: 'Ahmed Al-Rashidi',
    })
    @IsOptional()
    @IsString()
    @Length(2, 80)
    fullName?: string

    @ApiPropertyOptional({
        description: 'Email address',
        example: 'ahmed@example.com',
    })
    @IsOptional()
    @IsString()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
        message: 'Email format is invalid',
    })
    email?: string
}
