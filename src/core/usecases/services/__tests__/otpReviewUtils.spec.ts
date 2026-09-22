import {
  getReviewOtpCode,
  isReviewOtpEnabled,
  isReviewPhone,
  parseReviewOtpAccounts,
} from '../otpReviewUtils'

describe('otpReviewUtils', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('returns null when review mode is disabled', () => {
    process.env.OTP_REVIEW_ENABLED = 'false'
    process.env.OTP_REVIEW_ACCOUNTS = '+966500000101:1234'
    expect(getReviewOtpCode('+966500000101')).toBeNull()
  })

  it('parses review accounts and resolves fixed codes', () => {
    process.env.OTP_REVIEW_ENABLED = 'true'
    process.env.OTP_REVIEW_ACCOUNTS =
      '+966500000101:1234,+966500000102:5678'

    expect(parseReviewOtpAccounts(process.env.OTP_REVIEW_ACCOUNTS)).toEqual([
      { phone: '+966500000101', code: '1234' },
      { phone: '+966500000102', code: '5678' },
    ])
    expect(getReviewOtpCode('+966500000101')).toBe('1234')
    expect(getReviewOtpCode('+966500000102')).toBe('5678')
    expect(isReviewPhone('+966500000102')).toBe(true)
    expect(isReviewOtpEnabled()).toBe(true)
  })

  it('ignores malformed entries', () => {
    process.env.OTP_REVIEW_ENABLED = 'true'
    process.env.OTP_REVIEW_ACCOUNTS = 'bad,966500000101:1234,+966500000101:12'
    expect(parseReviewOtpAccounts(process.env.OTP_REVIEW_ACCOUNTS)).toEqual([])
  })
})
