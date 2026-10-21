import type { OtpChannel } from '../../shared/otp/otpConstants.js'

export type { OtpChannel }

export interface OtpService {
  sendOtp(phone: string, code: string, channel: OtpChannel): Promise<void>
}
