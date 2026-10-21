import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

import {
  authPhoneValidationMessage,
  isAllowedAuthPhone,
} from '../../../shared/phone/authPhone.js'

@ValidatorConstraint({ name: 'IsAllowedAuthPhone', async: false })
export class IsAllowedAuthPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isAllowedAuthPhone(value)
  }

  defaultMessage(): string {
    return authPhoneValidationMessage()
  }
}

export function IsAllowedAuthPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAllowedAuthPhoneConstraint,
    })
  }
}
