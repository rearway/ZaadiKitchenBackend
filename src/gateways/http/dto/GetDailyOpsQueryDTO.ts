import { IsOptional, IsString, IsIn, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetDailyOpsQueryDTO {
  @ApiPropertyOptional({
    enum: ['today', 'tomorrow'],
    description: 'UX-friendly day filter. Defaults to today (Asia/Riyadh).',
  })
  @IsOptional()
  @IsIn(['today', 'tomorrow'])
  day?: 'today' | 'tomorrow'

  @ApiPropertyOptional({
    example: '2026-09-18',
    description: 'Explicit delivery date (YYYY-MM-DD). Wins over day if both sent.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'delivery_date must be in YYYY-MM-DD format',
  })
  delivery_date?: string

  @ApiPropertyOptional({
    example: '2026-08-02',
    description: 'Legacy alias for delivery_date. Defaults to today in Asia/Riyadh.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string

  @ApiPropertyOptional({
    enum: ['open', 'all'],
    description: 'Only used by the issues list endpoint. Defaults to open.',
  })
  @IsOptional()
  @IsIn(['open', 'all'])
  status?: 'open' | 'all'
}
