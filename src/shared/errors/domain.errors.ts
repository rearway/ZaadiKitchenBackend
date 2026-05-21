import { BaseError } from './base.error'

export class ResourceNotFoundError extends BaseError {
  constructor(resource: string, identifier?: string) {
    super(
      'RESOURCE_NOT_FOUND',
      404,
      identifier
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`
    )
  }
}

export class ResourceAlreadyExistsError extends BaseError {
  constructor(resource: string, identifier?: string) {
    super(
      'RESOURCE_ALREADY_EXISTS',
      409,
      identifier
        ? `${resource} with identifier '${identifier}' already exists`
        : `${resource} already exists`
    )
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', 400, message, details)
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Invalid credentials') {
    super('AUTHENTICATION_ERROR', 401, message)
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized access') {
    super('UNAUTHORIZED', 403, message)
  }
}

export class RateLimitError extends BaseError {
  constructor(
    message = 'Too many attempts. Please try again later.',
    details?: any
  ) {
    super('RATE_LIMIT_EXCEEDED', 429, message, details)
  }
}

export class OtpExpiredError extends BaseError {
  constructor() {
    super('OTP_EXPIRED', 400, 'OTP has expired. Please request a new one.')
  }
}

export class OtpInvalidError extends BaseError {
  constructor() {
    super('OTP_INVALID', 400, 'Invalid OTP code.')
  }
}
