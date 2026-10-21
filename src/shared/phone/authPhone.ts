/** Saudi mobile: +966 + 9 digits */
const SAUDI_PHONE_REGEX = /^\+966[0-9]{9}$/

/** India mobile: +91 + 10 digits (E.164) */
const INDIA_PHONE_REGEX = /^\+91[0-9]{10}$/

export function isIndianAuthPhoneEnabled(): boolean {
  return process.env.OTP_ALLOW_INDIAN_PHONES === 'true'
}

export function isAllowedAuthPhone(phone: string): boolean {
  if (SAUDI_PHONE_REGEX.test(phone)) {
    return true
  }
  if (isIndianAuthPhoneEnabled() && INDIA_PHONE_REGEX.test(phone)) {
    return true
  }
  return false
}

export function authPhoneValidationMessage(): string {
  if (isIndianAuthPhoneEnabled()) {
    return 'Phone must be +966XXXXXXXXX (Saudi) or +91XXXXXXXXXX (India, testing)'
  }
  return 'Phone must be in Saudi format: +966XXXXXXXXX'
}
