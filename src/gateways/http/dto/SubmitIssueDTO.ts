import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const ISSUE_TYPES = ['wrong_order', 'quality_issue', 'not_delivered', 'damaged'] as const

export class SubmitIssueDTO {
  @ApiProperty({ description: 'Delivery date in YYYY-MM-DD format', example: '2025-06-05' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'deliveryDate must be in YYYY-MM-DD format' })
  deliveryDate: string

  @ApiProperty({ enum: ISSUE_TYPES })
  @IsEnum(ISSUE_TYPES)
  issueType: typeof ISSUE_TYPES[number]

  @ApiPropertyOptional({ description: 'Optional description of the issue', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}
