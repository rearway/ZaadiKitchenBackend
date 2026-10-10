import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class GetAdminMealsQueryDTO {
  @ApiPropertyOptional({ enum: ['all', 'active', 'draft'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'active', 'draft'])
  status?: 'all' | 'active' | 'draft'

  @ApiPropertyOptional({ enum: ['all', 'executive', 'salad'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'executive', 'salad'])
  meal_type?: 'all' | 'executive' | 'salad'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  per_page?: number

  @ApiPropertyOptional({ enum: ['picker'] })
  @IsOptional()
  @IsEnum(['picker'])
  context?: 'picker'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exclude_week_id?: string
}
