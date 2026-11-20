import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { OtpChannel, OtpService } from '../../core/entitygateway/OtpService.js'
import { OTP_EXPIRY_SECONDS } from '../../shared/otp/otpConstants.js'
import { tryClaimOtpSmsFallback } from '../../shared/otp/otpSmsFallbackGuard.js'
import { isOtpSmsFallbackEnabled } from '../../shared/otp/twilioOtpConfig.js'
import { SnsOtpService } from './sns-otp.service.js'
import { TwilioSmsOtpService } from './twilio-sms-otp.service.js'
import { TwilioWhatsAppOtpService } from './twilio-whatsapp-otp.service.js'

@Injectable()
export class RoutingOtpService implements OtpService {
  private readonly logger = new Logger(RoutingOtpService.name)
  private readonly twilioSms: TwilioSmsOtpService

  constructor(
    private readonly snsOtpService: SnsOtpService,
    private readonly twilioWhatsAppOtpService: TwilioWhatsAppOtpService,
    configService: ConfigService
  ) {
    this.twilioSms = new TwilioSmsOtpService(configService)
  }

  async sendOtp(phone: string, code: string, channel: OtpChannel): Promise<void> {
    if (channel === 'whatsapp') {
      try {
        await this.twilioWhatsAppOtpService.sendOtp(phone, code, channel)
      } catch (error) {
        const fallbackOk = await this.sendSmsFallbackIfEnabled(phone, code, `immediate:${phone}:${code}`)
        if (fallbackOk) {
          this.logger.warn(
            `WhatsApp OTP failed; SMS fallback used for ***${phone.slice(-4)}`,
            error instanceof Error ? error.message : String(error)
          )
          return
        }
        throw error
      }
      return
    }
    await this.snsOtpService.sendOtp(phone, code, channel)
  }

  /**
   * SMS fallback for failed WhatsApp delivery (same OTP code, deduped).
   * Used from routing and from the Twilio status callback use case.
   */
  async sendSmsFallbackIfEnabled(
    phone: string,
    code: string,
    dedupeKey: string
  ): Promise<boolean> {
    if (!isOtpSmsFallbackEnabled()) {
      return false
    }
    if (!tryClaimOtpSmsFallback(dedupeKey, OTP_EXPIRY_SECONDS * 1000)) {
      this.logger.log(`SMS fallback skipped (already sent) for key ${dedupeKey}`)
      return false
    }

    try {
      if (this.twilioSms.isConfigured()) {
        await this.twilioSms.sendOtpSms(phone, code)
      } else {
        await this.snsOtpService.sendOtp(phone, code, 'sms')
      }
      return true
    } catch (fallbackError) {
      this.logger.error(
        'OTP SMS fallback failed',
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      )
      return false
    }
  }
}