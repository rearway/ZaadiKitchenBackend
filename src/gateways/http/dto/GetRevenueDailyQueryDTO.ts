import { IsString, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class GetRevenueDailyQueryDTO {
  @ApiProperty({
    description: 'Month to display (YYYY-MM)',
    example: '2026-09',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string
}
