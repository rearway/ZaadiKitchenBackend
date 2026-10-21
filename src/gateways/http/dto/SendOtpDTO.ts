import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

import { IsAllowedAuthPhone } from '../validators/IsAllowedAuthPhone.js'

export class SendOtpDTO {
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
    description: 'Channel to send OTP',
    enum: ['whatsapp', 'sms'],
    example: 'whatsapp',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(whatsapp|sms)$/, {
    message: 'Channel must be whatsapp or sms',
  })
  channel: string
}
