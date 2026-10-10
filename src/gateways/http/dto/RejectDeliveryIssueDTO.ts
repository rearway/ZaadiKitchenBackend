import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RejectDeliveryIssueDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
