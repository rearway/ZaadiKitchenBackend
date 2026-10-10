import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class GetMenuWeeksQueryDTO {
  @ApiPropertyOptional({ example: 'w2025-23' })
  @IsOptional()
  @IsString()
  from_week?: string

  @ApiPropertyOptional({ default: 2, minimum: 1, maximum: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  count?: number
}
