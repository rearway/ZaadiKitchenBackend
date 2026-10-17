import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class GetAdminMealsQueryDTO {
  @ApiPropertyOptional({ enum: ['all', 'active', 'draft', 'updated'], default: 'all' })
  @IsOptional()
  @IsEnum(['all', 'active', 'draft', 'updated'])
  status?: 'all' | 'active' | 'draft' | 'updated'

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

  @ApiPropertyOptional({
    enum: ['picker'],
    description:
      'Shortcut for status=active and status=updated. Live version remains assignable while edits are pending.',
  })
  @IsOptional()
  @IsEnum(['picker'])
  context?: 'picker'

  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored. Kept so older clients do not get 400.',
  })
  @IsOptional()
  @IsString()
  exclude_week_id?: string
}
