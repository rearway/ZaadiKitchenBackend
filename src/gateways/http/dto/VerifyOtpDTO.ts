import { IsString, IsNotEmpty, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { IsAllowedAuthPhone } from '../validators/IsAllowedAuthPhone.js'

export class VerifyOtpDTO {
  @ApiProperty({
    description:
      'E.164 phone (+966 Saudi; +91 India when OTP_ALLOW_INDIAN_PHONES=true)',
    example: '+966500000000',
  })
  @IsString()
  @IsNotEmpty()
  @IsAllowedAuthPhone()
  phone: string

  @ApiProperty({
    description: '4-digit OTP code',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'OTP code must be exactly 4 digits' })
  code: string
}
