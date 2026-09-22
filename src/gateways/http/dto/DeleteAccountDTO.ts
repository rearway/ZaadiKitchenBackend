import { Equals } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DeleteAccountDTO {
  @ApiProperty({
    example: true,
    description: 'Must be true to confirm permanent account deletion',
  })
  @Equals(true, { message: 'confirm must be true to delete your account' })
  confirm!: true
}
