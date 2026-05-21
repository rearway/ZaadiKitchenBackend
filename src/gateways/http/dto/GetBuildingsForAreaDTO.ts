import { IsString, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetBuildingsForAreaDTO {
  @ApiPropertyOptional({
    description: 'Optional filter for building name',
    example: 'tower',
  })
  @IsOptional()
  @IsString()
  q?: string
}
