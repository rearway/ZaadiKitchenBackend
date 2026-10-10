import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class PauseSubscriptionDTO {
  @ApiProperty({ example: '2025-05-12' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'start_date must be YYYY-MM-DD' })
  start_date!: string

  @ApiProperty({ example: '2025-05-18' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'end_date must be YYYY-MM-DD' })
  end_date!: string
}
