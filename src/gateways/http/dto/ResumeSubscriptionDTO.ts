import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResumeSubscriptionDTO {
  @ApiProperty({ example: '2025-05-20' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'resume_date must be YYYY-MM-DD' })
  resume_date!: string
}
