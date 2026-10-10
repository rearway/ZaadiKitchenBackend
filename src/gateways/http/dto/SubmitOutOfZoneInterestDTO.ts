import { IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SubmitOutOfZoneInterestDTO {
  @ApiProperty({
    description: 'Area name',
    example: 'Al Zahra',
  })
  @IsString()
  @Length(2, 100)
  areaName: string
}
