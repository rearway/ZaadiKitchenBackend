import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RefreshTokenDTO {
  @ApiProperty({
    description: 'Refresh token received during login',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}
