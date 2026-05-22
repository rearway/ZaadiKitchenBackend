import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ValidateReferralDTO {
  @ApiProperty({ example: 'AHMED15' })
  @IsString()
  @IsNotEmpty()
  code!: string

  @ApiProperty({ example: 'month' })
  @IsString()
  @IsNotEmpty()
  plan_id!: string
}
