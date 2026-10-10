import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const RIDER_ISSUE_TYPES = ['customer_not_found', 'wrong_address', 'access_denied', 'other'] as const

export class ReportRiderIssueDTO {
  @ApiProperty({ enum: RIDER_ISSUE_TYPES })
  @IsEnum(RIDER_ISSUE_TYPES)
  issue_type: typeof RIDER_ISSUE_TYPES[number]

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string
}
