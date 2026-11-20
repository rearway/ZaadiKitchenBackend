import type { OtpChannel } from '../../shared/otp/otpConstants.js'

export type { OtpChannel }

export interface OtpService {
  sendOtp(phone: string, code: string, channel: OtpChannel): Promise<void>
  /** Same OTP via SMS when WhatsApp fails (optional; implemented by RoutingOtpService). */
  sendSmsFallbackIfEnabled?(
    phone: string,
    code: string,
    dedupeKey: string
  ): Promise<boolean>
}
