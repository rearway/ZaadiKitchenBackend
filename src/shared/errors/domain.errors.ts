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

export class CheckoutAlreadyCompletedError extends BaseError {
  constructor() {
    super(
      'CHECKOUT_ALREADY_COMPLETED',
      409,
      'This checkout has already been paid. Check your subscription before trying again.'
    )
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

export class MealIsDraftError extends BaseError {
  constructor() {
    super('MEAL_IS_DRAFT', 422, 'Draft meals cannot be assigned to week slots. Activate the meal first.')
  }
}

export class DayMealTypeAlreadyAssignedError extends BaseError {
  constructor(
    mealType: string,
    deliveryDate: string,
    existingSlotId: string,
    existingMealName: string
  ) {
    const [one, many] =
      mealType === 'salad'
        ? ['A salad', 'salads']
        : ['An executive meal', 'executive meals']
    super(
      'DAY_MEAL_TYPE_ALREADY_ASSIGNED',
      409,
      `${one} (${existingMealName}) is already assigned for ${deliveryDate}. You cannot assign two ${many} on the same day.`,
      {
        meal_type: mealType,
        delivery_date: deliveryDate,
        existing_slot_id: existingSlotId,
        existing_meal_name: existingMealName,
      }
    )
  }
}

export class DayMealTypeLimitError extends BaseError {
  constructor(mealType: string, deliveryDate: string, limit: number) {
    const label = mealType === 'salad' ? 'Salad' : 'Executive'
    super(
      'DAY_MEAL_TYPE_LIMIT',
      409,
      `${label} already has ${limit} dishes on ${deliveryDate}.`,
      { meal_type: mealType, delivery_date: deliveryDate, limit }
    )
  }
}

export class CannotClearDefaultError extends BaseError {
  constructor(deliveryDate: string, mealType: string) {
    super(
      'CANNOT_CLEAR_DEFAULT',
      409,
      `Set another ${mealType} default for ${deliveryDate} before clearing this dish.`,
      { delivery_date: deliveryDate, meal_type: mealType }
    )
  }
}

export class WeekNotCompleteError extends BaseError {
  constructor(reason: string, details?: unknown) {
    super('WEEK_NOT_COMPLETE', 409, reason, (details as object) ?? { reason })
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
  constructor(
    affectedWeeks: string[],
    details?: { action?: 'edit' | 'draft' | 'activate' }
  ) {
    const action = details?.action ?? 'edit'
    const weeks = affectedWeeks.join(', ')
    const message =
      action === 'activate'
        ? 'Activating these meal changes will update the live menu wherever this meal is used, including days that are already past cutoff. Pass confirm_published_edit: true to proceed.'
        : action === 'draft'
          ? `This meal is currently in the published menu for ${weeks}. Moving it to Draft will remove it from the customer-visible menu. Pass confirm_published_edit: true to proceed.`
          : `This meal is currently in the published menu for ${weeks}. Pass confirm_published_edit: true to proceed.`
    super('MEAL_IN_PUBLISHED_WEEK', 409, message, {
      affected_weeks: affectedWeeks,
      affects_live_menu: affectedWeeks.length > 0,
    })
  }
}

export class RatingAlreadySubmittedError extends BaseError {
  constructor() {
    super('RATING_ALREADY_SUBMITTED', 409, 'You have already rated this meal. Ratings cannot be changed after submission.')
  }
}

export class DeliveryNotFoundError extends BaseError {
  constructor() {
    super('DELIVERY_NOT_FOUND', 404, 'Delivery not found.')
  }
}

export class AlreadyDeliveredError extends BaseError {
  constructor() {
    super('ALREADY_DELIVERED', 409, 'This delivery has already been marked as delivered.')
  }
}

export class StageMismatchError extends BaseError {
  constructor(actualStage: string, expectedStage: string) {
    super(
      'STAGE_MISMATCH',
      409,
      `Pipeline is currently at '${actualStage}', not '${expectedStage}'. Refresh and try again.`
    )
  }
}

export class IssueAlreadyResolvedError extends BaseError {
  constructor() {
    super('ISSUE_ALREADY_RESOLVED', 409, 'This issue has already been resolved.')
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

export class SamePlanNotAllowedError extends BaseError {
  constructor() {
    super(
      'SAME_PLAN_NOT_ALLOWED',
      422,
      'You already have an active subscription on this plan. Choose a higher plan to upgrade.'
    )
  }
}

export class PlanPromotionNotAllowedError extends BaseError {
  constructor(fromPlan: string, toPlan: string) {
    super(
      'PLAN_PROMOTION_NOT_ALLOWED',
      422,
      `Cannot change from ${fromPlan} to ${toPlan}. Only upgrades to a higher plan tier are allowed.`,
      { from_plan: fromPlan, to_plan: toPlan }
    )
  }
}

export class ActiveSubscriptionCheckoutBlockedError extends BaseError {
  constructor(message = 'You already have a subscription. Upgrade to a higher plan or wait until it expires to purchase again.') {
    super('ACTIVE_SUBSCRIPTION_CHECKOUT_BLOCKED', 422, message)
  }
}
