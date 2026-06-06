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

export class SessionExpiredError extends BaseError {
  constructor(
    message = 'This checkout session has expired. Please start again.'
  ) {
    super('SESSION_EXPIRED', 410, message)
  }
}

export class PaymentFailedError extends BaseError {
  constructor(
    message = 'Your payment could not be processed. Please check your card details and try again.'
  ) {
    super('PAYMENT_FAILED', 402, message)
  }
}

export class InvalidCodeError extends BaseError {
  constructor(
    message = "This code doesn't exist or has already been used.",
    details?: unknown
  ) {
    super('INVALID_CODE', 422, message, details)
  }
}

export class NotNewUserError extends BaseError {
  constructor() {
    super(
      'NOT_NEW_USER',
      422,
      "Referral codes are valid for new users' first subscription only."
    )
  }
}

export class PromoLockedError extends BaseError {
  constructor(details?: unknown) {
    super(
      'PROMO_LOCKED',
      423,
      'Too many invalid attempts. Promo field has been disabled for this session.',
      details
    )
  }
}

export class SkipLimitReachedError extends BaseError {
  constructor(details?: unknown) {
    super(
      'SKIP_LIMIT_REACHED',
      409,
      "You've used all your skip days for this plan period.",
      details
    )
  }
}

export class PastCutoffError extends BaseError {
  constructor(
    message = 'The skip cutoff (6 PM the day before delivery) has passed for this date.'
  ) {
    super('PAST_CUTOFF', 422, message)
  }
}

export class PauseLimitExceededError extends BaseError {
  constructor(details?: unknown) {
    super(
      'PAUSE_LIMIT_EXCEEDED',
      409,
      'The requested pause exceeds your remaining pause days.',
      details
    )
  }
}

export class PlanMismatchError extends BaseError {
  constructor() {
    super('PLAN_MISMATCH', 422, 'This code is not valid for the selected plan.')
  }
}

export class MealNotFoundError extends BaseError {
  constructor() {
    super('MEAL_NOT_FOUND', 404, 'Meal not found.')
  }
}

export class MealAlreadyUsedInWeekError extends BaseError {
  constructor(mealName: string, usedOnDay: string, usedInSlot: string, details?: unknown) {
    super(
      'MEAL_ALREADY_USED',
      409,
      `${mealName} is already assigned to ${usedOnDay} (${usedInSlot}) this week. Each meal can only appear once per week.`,
      details
    )
  }
}

export class MealIsDraftError extends BaseError {
  constructor() {
    super('MEAL_IS_DRAFT', 422, 'Draft meals cannot be assigned to week slots. Activate the meal first.')
  }
}

export class WeekNotCompleteError extends BaseError {
  constructor(unfilledSlots: unknown[]) {
    super('WEEK_NOT_COMPLETE', 409, `Cannot publish. ${unfilledSlots.length} slot${unfilledSlots.length > 1 ? 's are' : ' is'} still unfilled.`, { unfilled_slots: unfilledSlots })
  }
}

export class WeekAlreadyPublishedError extends BaseError {
  constructor() {
    super('WEEK_ALREADY_PUBLISHED', 409, 'This week has already been published.')
  }
}

export class SlotNotEditableError extends BaseError {
  constructor() {
    super('SLOT_NOT_EDITABLE', 422, 'This slot belongs to a published week and cannot be modified.')
  }
}

export class MealInPublishedWeekError extends BaseError {
  constructor(affectedWeeks: string[], details?: unknown) {
    super(
      'MEAL_IN_PUBLISHED_WEEK',
      409,
      `This meal is currently in the published menu for ${affectedWeeks.join(', ')}. Pass confirm_published_edit: true to proceed.`,
      { affected_weeks: affectedWeeks, ...((details as object) ?? {}) }
    )
  }
}

export class ActivationRequiresConfirmationError extends BaseError {
  constructor(areaName: string) {
    super(
      'ACTIVATION_REQUIRES_CONFIRMATION',
      409,
      `Activating ${areaName} will make it immediately selectable by customers in the Area Search screen. Pass confirm_activation: true to proceed.`,
      { warning: `${areaName} will become immediately selectable by new customers on activation.` }
    )
  }
}
