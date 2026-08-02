import { IsOptional, IsString, IsIn, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetDailyOpsQueryDTO {
  @ApiPropertyOptional({ example: '2026-08-02', description: 'Defaults to today' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string

  @ApiPropertyOptional({ enum: ['open', 'all'], description: 'Only used by the issues list endpoint. Defaults to open.' })
  @IsOptional()
  @IsIn(['open', 'all'])
  status?: 'open' | 'all'
}
