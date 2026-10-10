import { IsNumber, IsString, IsNotEmpty, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class AdminCreditWalletDTO {
  @ApiProperty({ description: 'Credit amount in SAR (1–500)', example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  amountSar: number

  @ApiProperty({
    description: 'Mandatory admin note explaining the reason for the credit',
    example: 'Compensation for missed delivery on 2025-05-03',
  })
  @IsString()
  @IsNotEmpty()
  note: string
}
