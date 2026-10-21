import { IsEnum, IsOptional, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AddMenuDaySlotDTO {
  @ApiProperty({ enum: ['executive', 'salad'] })
  @IsEnum(['executive', 'salad'])
  meal_type: 'executive' | 'salad'

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  meal_id?: string
}
