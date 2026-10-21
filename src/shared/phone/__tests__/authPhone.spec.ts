import {
  isAllowedAuthPhone,
  isIndianAuthPhoneEnabled,
} from '../authPhone.js'

describe('authPhone', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('accepts Saudi E.164 numbers', () => {
    process.env.OTP_ALLOW_INDIAN_PHONES = 'false'
    expect(isAllowedAuthPhone('+966512345678')).toBe(true)
  })

  it('rejects Indian numbers when OTP_ALLOW_INDIAN_PHONES is false', () => {
    process.env.OTP_ALLOW_INDIAN_PHONES = 'false'
    expect(isAllowedAuthPhone('+919876543210')).toBe(false)
  })

  it('accepts Indian numbers when OTP_ALLOW_INDIAN_PHONES is true', () => {
    process.env.OTP_ALLOW_INDIAN_PHONES = 'true'
    expect(isIndianAuthPhoneEnabled()).toBe(true)
    expect(isAllowedAuthPhone('+919876543210')).toBe(true)
    expect(isAllowedAuthPhone('+966512345678')).toBe(true)
  })

  it('rejects invalid formats', () => {
    process.env.OTP_ALLOW_INDIAN_PHONES = 'true'
    expect(isAllowedAuthPhone('+971501234567')).toBe(false)
    expect(isAllowedAuthPhone('9876543210')).toBe(false)
  })
})
