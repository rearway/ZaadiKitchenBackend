import { IsEnum, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SetMenuDayDefaultDTO {
  @ApiProperty({ enum: ['executive', 'salad'] })
  @IsEnum(['executive', 'salad'])
  meal_type: 'executive' | 'salad'

  @ApiProperty()
  @IsUUID()
  meal_id: string
}
