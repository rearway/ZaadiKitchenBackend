import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import twilio from 'twilio'

import {
  getTwilioSmsFallbackFrom,
  getTwilioSmsMessagingServiceSid,
  isTwilioSmsFallbackConfigured,
} from '../../shared/otp/twilioOtpConfig.js'
import {
  assertFourDigitOtpCode,
  normalizeE164Phone,
} from '../../shared/otp/twilioWhatsAppPayload.js'

@Injectable()
export class TwilioSmsOtpService {
  private readonly logger = new Logger(TwilioSmsOtpService.name)
  private readonly client: ReturnType<typeof twilio> | null

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
    this.client = accountSid && authToken ? twilio(accountSid, authToken) : null
  }

  isConfigured(): boolean {
    return Boolean(this.client && isTwilioSmsFallbackConfigured())
  }

  async sendOtpSms(phone: string, code: string): Promise<void> {
    if (!this.client) {
      throw new Error('Twilio SMS fallback is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)')
    }
    if (!isTwilioSmsFallbackConfigured()) {
      throw new Error(
        'Twilio SMS fallback requires TWILIO_SMS_FROM or TWILIO_SMS_MESSAGING_SERVICE_SID'
      )
    }

    assertFourDigitOtpCode(code)
    const to = normalizeE164Phone(phone)
    const messagingServiceSid = getTwilioSmsMessagingServiceSid()
    const from = getTwilioSmsFallbackFrom()

    const body = `Your Platio Kitchen verification code is: ${code}. Valid for 2 minutes.`

    const message = messagingServiceSid
      ? await this.client.messages.create({
          to,
          messagingServiceSid,
          body,
        })
      : await this.client.messages.create({
          to,
          from: from!,
          body,
        })

    this.logger.log(
      `OTP SMS fallback sent to ***${to.slice(-4)} (sid: ${message.sid}, status: ${message.status})`
    )
  }
}