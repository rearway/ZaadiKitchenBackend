import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendOtpDTO {
  // @ApiProperty({
  //   description: 'Phone number in Saudi format (+966XXXXXXXXX)',
  //   example: '+966500000000',
  // })
  @IsString()
  @IsNotEmpty()
  // @Matches(/^\+966[0-9]{9}$/, {
  //   message: 'Phone must be in Saudi format: +966XXXXXXXXX',
  // })
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
