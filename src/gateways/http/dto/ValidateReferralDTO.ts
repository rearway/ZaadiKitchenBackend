import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ValidateReferralDTO {
  @ApiProperty({ example: 'AHMED15' })
  @IsString()
  @IsNotEmpty()
  code!: string

  @ApiPropertyOptional({ example: 'month' })
  @IsOptional()
  @IsString()
  plan_id?: string
}
