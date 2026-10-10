import { IsString, IsNotEmpty, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddPaymentMethodDTO {
  @ApiProperty({
    example: 'mada',
    enum: ['mada', 'visa', 'mastercard', 'stc_pay', 'apple_pay'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['mada', 'visa', 'mastercard', 'stc_pay', 'apple_pay'])
  type!: 'mada' | 'visa' | 'mastercard' | 'stc_pay' | 'apple_pay'

  @ApiProperty({ example: 'tok_sandbox_xxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  token!: string
}
