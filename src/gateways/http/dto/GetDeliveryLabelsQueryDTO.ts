import { IsOptional, IsString, IsIn, IsUUID, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetDeliveryLabelsQueryDTO {
  @ApiPropertyOptional({
    enum: ['today', 'tomorrow'],
    description: 'UX-friendly day filter. Defaults to today (Asia/Riyadh).',
  })
  @IsOptional()
  @IsIn(['today', 'tomorrow'])
  day?: 'today' | 'tomorrow'

  @ApiPropertyOptional({
    example: '2026-09-18',
    description: 'Explicit delivery date (YYYY-MM-DD). Wins over day if both sent. Must be today or tomorrow in Asia/Riyadh.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'delivery_date must be in YYYY-MM-DD format',
  })
  delivery_date?: string

  @ApiPropertyOptional({
    example: '2026-09-18',
    description: 'Legacy alias for delivery_date',
  })
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

  @ApiPropertyOptional({
    description: 'Download endpoint only: a single delivery_day id to render one label',
  })
  @IsOptional()
  @IsUUID()
  label_id?: string
}
