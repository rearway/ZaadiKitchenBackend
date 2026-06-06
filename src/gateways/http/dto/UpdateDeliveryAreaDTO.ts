import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDeliveryAreaDTO {
  @ApiPropertyOptional({ description: 'Updated area name', example: 'Al Zahra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({
    description: 'Short coverage description',
    example: 'Residential & offices',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  coverage?: string

  @ApiPropertyOptional({
    description: 'Area status',
    enum: ['active', 'coming_soon', 'paused'],
  })
  @IsOptional()
  @IsEnum(['active', 'coming_soon', 'paused'])
  status?: 'active' | 'coming_soon' | 'paused'

  @ApiPropertyOptional({
    description:
      'Required when activating an area for the first time. Confirms the area becomes immediately visible to customers.',
  })
  @IsOptional()
  @IsBoolean()
  confirm_activation?: boolean
}
