import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AssignDriverAreaDTO {
  @ApiProperty({
    format: 'uuid',
    description:
      'Delivery area to give this driver. One area belongs to one driver. A driver may hold several areas. Re-assigning an area this driver already has is a no-op success.',
  })
  @IsUUID('4')
  area_id: string
}
