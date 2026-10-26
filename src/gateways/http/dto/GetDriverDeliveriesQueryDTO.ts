import { IsOptional, IsString, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetDriverDeliveriesQueryDTO {
  @ApiPropertyOptional({
    example: '2026-10-26',
    description:
      'Ops day in Asia/Riyadh (YYYY-MM-DD). Defaults to today in Asia/Riyadh. An empty day is an empty list, not an error.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string
}
