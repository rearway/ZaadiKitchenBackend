import { IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ToggleSaladDTO {
  @ApiProperty({ description: 'true = salad, false = executive' })
  @IsBoolean()
  enabled!: boolean
}
