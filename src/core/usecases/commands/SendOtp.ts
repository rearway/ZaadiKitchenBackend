import { Deps } from '../../entitygateway/index.js'
import {
  getReviewOtpCode,
  isReviewPhone,
} from '../services/otpReviewUtils.js'
import {
  OTP_EXPIRY_SECONDS,
  normalizeOtpChannel,
  isTwilioWhatsAppConfigured,
} from '../../../shared/otp/otpConstants.js'
import {
  authPhoneValidationMessage,
  isAllowedAuthPhone,
} from '../../../shared/phone/authPhone.js'

export interface SendOtpInput {
  phone: string
  channel: string
}

export type SendOtpOutput = {
  message: string
  data: {
    phone: string
    channel: string
    expiresInSeconds: number
    otpCode?: string
  }
}

export function makeUC(deps: Deps) {
  return async function sendOtp(input: SendOtpInput): Promise<SendOtpOutput> {
    const {
      logger,
      otpSessionLoader,
      otpSessionPersistor,
      otpService,
      skipOtp,
    } = deps

    try {
      const { phone } = input
      if (!isAllowedAuthPhone(phone)) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(authPhoneValidationMessage())
      }

      const channel = normalizeOtpChannel(input.channel)
      const reviewFixedCode = getReviewOtpCode(phone)
      const isReviewAccount = isReviewPhone(phone)

      if (
        channel === 'whatsapp' &&
        !skipOtp &&
        !isReviewAccount &&
        !isTwilioWhatsAppConfigured()
      ) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'WhatsApp OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.'
        )
      }

      // Check if phone is locked out
      const lockedSession = await otpSessionLoader.getLockedSession(phone)
      if (!isReviewAccount && lockedSession && lockedSession.lockedUntil) {
        const now = new Date()
        if (lockedSession.lockedUntil > now) {
          const remainingMs =
            lockedSession.lockedUntil.getTime() - now.getTime()
          const remainingMinutes = Math.ceil(remainingMs / 60000)
          const { RateLimitError } =
            await import('../../../shared/errors/index.js')
          throw new RateLimitError(
            `Too many OTP attempts. Try again in ${remainingMinutes} minute(s).`,
            { lockedUntil: lockedSession.lockedUntil }
          )
        }
      }

      // Check rate limit — max 3 attempts per 10 minutes
      const maxAttempts = 3
      const windowMinutes = 10
      const recentCount = await otpSessionLoader.getRecentAttemptCount(
        phone,
        windowMinutes
      )

      if (!isReviewAccount && recentCount >= maxAttempts) {
        const lockDurationMinutes = 30
        const lockedUntil = new Date(
          Date.now() + lockDurationMinutes * 60 * 1000
        )
        await otpSessionPersistor.lockPhone(phone, lockedUntil)

        const { RateLimitError } =
          await import('../../../shared/errors/index.js')
        throw new RateLimitError(
          `Maximum ${maxAttempts} OTP requests per ${windowMinutes} minutes exceeded. Please wait.`,
          { lockedUntil }
        )
      }

      const expirySeconds = OTP_EXPIRY_SECONDS

      // Generate 4-digit OTP (fixed for Play Store review accounts when enabled)
      const code =
        reviewFixedCode ?? Math.floor(1000 + Math.random() * 9000).toString()

      const expiresAt = new Date(Date.now() + expirySeconds * 1000)

      await otpSessionPersistor.createSession({
        phone,
        channel,
        code,
        expiresAt,
      })

      try {
        await otpService.sendOtp(phone, code, channel)
      } catch (sendError) {
        logger.error(
          'OTP notification failed',
          sendError instanceof Error ? sendError.message : String(sendError)
        )
      }

      return {
        message: 'OTP sent successfully',
        data: {
          phone,
          channel,
          expiresInSeconds: expirySeconds,
          ...((skipOtp || isReviewAccount) && { otpCode: code }),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to send OTP',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SendOtp'
