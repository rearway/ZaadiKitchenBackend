import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddBuildingDTO {
  @ApiProperty({
    description: 'Name of the building',
    example: 'Al Nakheel Gate Tower',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string
}
