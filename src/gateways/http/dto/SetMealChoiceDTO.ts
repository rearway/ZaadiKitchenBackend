import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SetMealChoiceDTO {
  @ApiProperty({ description: 'Meal to receive that day', format: 'uuid' })
  @IsUUID()
  meal_id!: string
}
