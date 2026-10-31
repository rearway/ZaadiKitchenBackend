import { IsOptional, IsEnum, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetCustomerMenuWeekQueryDTO {
  @ApiPropertyOptional({ enum: ['all', 'executive', 'salad'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'executive', 'salad'])
  meal_type?: 'all' | 'executive' | 'salad'

  @ApiPropertyOptional({
    description:
      'Riyadh civil date YYYY-MM-DD inside this week or next week (Sunday through the following Thursday).',
  })
  @IsOptional()
  @IsString()
  date?: string
}
