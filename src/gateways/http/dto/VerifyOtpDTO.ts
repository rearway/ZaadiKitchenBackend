import { IsString, IsNotEmpty, Matches, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyOtpDTO {
  // @ApiProperty({
  //   description: 'Phone number in Saudi format (+966XXXXXXXXX)',
  //   example: '+966500000000',
  // })
  @IsString()
  // @IsNotEmpty()
  // @Matches(/^\+966[0-9]{9}$/, {
  //   message: 'Phone must be in Saudi format: +966XXXXXXXXX',
  // })
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
