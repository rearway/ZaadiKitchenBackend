import { IsOptional, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetCustomerMenuWeekQueryDTO {
  @ApiPropertyOptional({ enum: ['all', 'executive', 'salad'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'executive', 'salad'])
  meal_type?: 'all' | 'executive' | 'salad'
}
