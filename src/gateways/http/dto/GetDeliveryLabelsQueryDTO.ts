import { IsOptional, IsString, IsIn, IsUUID, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetDeliveryLabelsQueryDTO {
  @ApiPropertyOptional({ example: '2026-08-02', description: 'Defaults to today' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string

  @ApiPropertyOptional({ enum: ['all', 'executive', 'salad'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'executive', 'salad'])
  meal_type?: 'all' | 'executive' | 'salad'

  @ApiPropertyOptional({ description: 'Filter to a single delivery area' })
  @IsOptional()
  @IsUUID()
  area_id?: string

  @ApiPropertyOptional({ description: 'Download endpoint only: a single delivery_day id to render one label' })
  @IsOptional()
  @IsUUID()
  label_id?: string
}
