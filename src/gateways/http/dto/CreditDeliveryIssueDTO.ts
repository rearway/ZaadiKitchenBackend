import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreditDeliveryIssueDTO {
  @ApiProperty({ example: 28 })
  @IsNumber()
  @Min(1)
  @Max(500)
  credit_sar: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
