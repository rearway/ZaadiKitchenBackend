import { IsOptional, IsString, IsUUID, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetMyDeliveriesQueryDTO {
  @ApiPropertyOptional({ example: '2026-08-02', description: 'Defaults to today' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string

  @ApiPropertyOptional({ description: 'Filter to a single delivery area' })
  @IsOptional()
  @IsUUID()
  area_id?: string
}
