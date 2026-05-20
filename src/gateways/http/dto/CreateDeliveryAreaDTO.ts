import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDeliveryAreaDTO {
    @ApiProperty({
        description: 'Name of the delivery area',
        example: 'Downtown Dubai',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string

    @ApiPropertyOptional({
        description: 'Optional description of the area boundaries',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string

    @ApiPropertyOptional({
        description: 'Status of the delivery area',
        enum: ['active', 'coming_soon'],
        default: 'coming_soon',
    })
    @IsOptional()
    @IsEnum(['active', 'coming_soon'])
    status?: 'active' | 'coming_soon'
}
