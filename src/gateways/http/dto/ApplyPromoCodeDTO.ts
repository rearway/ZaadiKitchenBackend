import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ApplyPromoCodeDTO {
  @ApiProperty({ example: 'AHMED15' })
  @IsString()
  @IsNotEmpty()
  code!: string
}
