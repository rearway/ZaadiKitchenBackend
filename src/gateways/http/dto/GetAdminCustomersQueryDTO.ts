import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class GetAdminCustomersQueryDTO {
  @ApiPropertyOptional({
    description: 'Search by name, phone, or email',
    example: 'Ahmed',
  })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({
    description: 'Filter by subscription status',
    enum: ['active', 'paused', 'cancelled', 'expired'],
    example: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'paused', 'cancelled', 'expired'])
  status?: string

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({
    description: 'Results per page (max 50)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  per_page?: number
}
