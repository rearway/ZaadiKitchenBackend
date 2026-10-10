import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendBulkBroadcastDTO {
  @ApiProperty({ description: 'Notification Title', example: 'Special Offer!' })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ description: 'Notification Body', example: 'Get 20% off on all salads today.' })
  @IsString()
  @IsNotEmpty()
  body: string
}
