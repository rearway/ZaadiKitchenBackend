import { Deps } from '../../entitygateway/index.js'

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
    const { logger, otpSessionLoader, otpSessionPersistor, otpService } = deps

    try {
      const { phone, channel } = input

      // Validate phone format (Saudi: +966XXXXXXXXX)
      const phoneRegex = /^\+966[0-9]{9}$/
      if (!phoneRegex.test(phone)) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'Invalid phone number format. Expected +966XXXXXXXXX'
        )
      }

      // Check if phone is locked out
      const lockedSession = await otpSessionLoader.getLockedSession(phone)
      if (lockedSession && lockedSession.lockedUntil) {
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

      if (recentCount >= maxAttempts) {
        // Lock the phone for 30 minutes
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

      // Generate 4-digit OTP
      const code = Math.floor(1000 + Math.random() * 9000).toString()

      // OTP expires in 120 seconds
      const expirySeconds = 120
      const expiresAt = new Date(Date.now() + expirySeconds * 1000)

      // Store OTP session
      await otpSessionPersistor.createSession({
        phone,
        code,
        expiresAt,
      })

      // Send OTP via WhatsApp/SMS — skip gracefully if not configured
      try {
        await otpService.sendOtp(phone, code)
      } catch (sendError) {
        logger.error(
          'OTP notification failed (WhatsApp/SMS not configured)',
          sendError instanceof Error ? sendError.message : String(sendError)
        )
        // Do not rethrow — OTP is still valid in DB, dev can read it from response
      }

      return {
        message: 'OTP sent successfully',
        data: {
          phone,
          channel,
          expiresInSeconds: expirySeconds,
          otpCode: code, // Kept in response until WhatsApp is integrated
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
