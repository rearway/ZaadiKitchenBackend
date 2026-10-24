import { IsString, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ForcePipelineLockDTO {
  @ApiProperty({
    example: '2026-10-26',
    description:
      'Sun–Thu delivery date to treat as past the Daily Ops and ERP cutoffs',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string
}
