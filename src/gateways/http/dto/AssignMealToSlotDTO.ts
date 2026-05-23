import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AssignMealToSlotDTO {
  @ApiProperty({ example: 'meal_01JK2ABX' })
  @IsUUID()
  meal_id: string
}
