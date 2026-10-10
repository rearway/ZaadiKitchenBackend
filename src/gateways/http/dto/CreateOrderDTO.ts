import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateOrderDTO {
  @ApiProperty({ example: 'sess_01JK2MNP3QRS4TUV5WXY6Z' })
  @IsString()
  @IsNotEmpty()
  session_id!: string

  @ApiProperty({ example: 'pm_abc123' })
  @IsString()
  @IsNotEmpty()
  payment_method_id!: string

  @ApiProperty({ example: '2025-05-05' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'start_date must be YYYY-MM-DD' })
  start_date!: string
}
