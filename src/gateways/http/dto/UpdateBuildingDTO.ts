import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateBuildingDTO {
  @ApiProperty({
    description: 'Updated building name',
    example: 'Al Nakheel Gate Tower (North Wing)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string
}
