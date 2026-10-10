import { IsBoolean, IsIn, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { BROADCAST_SEGMENT_IDS } from '../../../core/usecases/services/commsUtils.js'

export class UpdateCommsAutomationDTO {
  @ApiProperty({ example: true })
  @IsBoolean()
  is_enabled!: boolean
}

export class SendCommsBroadcastDTO {
  @ApiProperty({
    enum: [...BROADCAST_SEGMENT_IDS],
    example: 'delivering_today',
  })
  @IsString()
  @IsIn([...BROADCAST_SEGMENT_IDS])
  segment_id!: string

  @ApiProperty({
    example: 'Your lunch is on the way! Expected delivery between 12:00–1:00 PM. 🍱',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  message!: string
}
