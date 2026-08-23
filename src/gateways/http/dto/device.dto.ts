import { IsString, IsNotEmpty, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDeviceDTO {
  @ApiProperty({ description: 'Platform OS', enum: ['ios', 'android'] })
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android'

  @ApiProperty({ description: 'Device Push Token from OS' })
  @IsString()
  @IsNotEmpty()
  deviceToken: string
}
