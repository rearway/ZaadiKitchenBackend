import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import twilio from 'twilio'

import type { OtpChannel, OtpService } from '../../core/entitygateway/OtpService.js'
import { getTwilioStatusCallbackUrl } from '../../shared/otp/twilioOtpConfig.js'
import {
  assertFourDigitOtpCode,
  buildTwilioWhatsAppOtpCreateParams,
  formatWhatsAppAddress,
  formatWhatsAppFrom,
} from '../../shared/otp/twilioWhatsAppPayload.js'

@Injectable()
export class TwilioWhatsAppOtpService implements OtpService {
  private readonly logger = new Logger(TwilioWhatsAppOtpService.name)
  private readonly client: ReturnType<typeof twilio> | null
  private readonly from: string | null
  private readonly contentSid: string | null
  private readonly statusCallbackUrl: string | null

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
    this.from = this.configService.get<string>('TWILIO_WHATSAPP_FROM') || null
    this.contentSid =
      this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID') || null
    this.statusCallbackUrl = getTwilioStatusCallbackUrl()
    this.client = accountSid && authToken ? twilio(accountSid, authToken) : null

    const messagingServiceSid = this.configService.get<string>(
      'TWILIO_MESSAGING_SERVICE_SID'
    )
    if (messagingServiceSid) {
      this.logger.warn(
        'TWILIO_MESSAGING_SERVICE_SID is set but WhatsApp OTP sends use From only (no MessagingServiceSid) to avoid sender mismatch with authentication templates.'
      )
    }

    const isSandboxFrom =
      !this.from ||
      this.from.includes('14155238886') ||
      this.from.includes('sandbox')
    if (this.client && this.from && !isSandboxFrom && !this.contentSid) {
      this.logger.warn(
        'TWILIO_WHATSAPP_CONTENT_SID is unset. Production WhatsApp OTP requires a Meta-approved authentication template (Content SID HX...). Plain-text sends usually fail.'
      )
    }
  }

  async sendOtp(phone: string, code: string, _channel: OtpChannel): Promise<void> {
    if (!this.client || !this.from) {
      throw new Error(
        'Twilio WhatsApp is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)'
      )
    }

    assertFourDigitOtpCode(code)
    const from = formatWhatsAppFrom(this.from)
    const to = formatWhatsAppAddress(phone)
    const statusCallback = this.statusCallbackUrl ?? undefined

    if (this.contentSid) {
      const createParams = buildTwilioWhatsAppOtpCreateParams({
        from: this.from,
        phoneE164: phone,
        code,
        contentSid: this.contentSid,
        statusCallbackUrl: this.statusCallbackUrl,
      })

      const message = await this.client.messages.create(createParams)

      if (
        message.status === 'failed' ||
        (message.errorCode !== undefined && message.errorCode !== null)
      ) {
        throw new Error(
          `Twilio WhatsApp template send failed (status: ${message.status}, error: ${message.errorCode})`
        )
      }

      this.logger.log(
        `OTP WhatsApp template sent to ${phone} (sid: ${message.sid}, status: ${message.status})`
      )
      return
    }

    const message = await this.client.messages.create({
      from,
      to,
      body: `Your Platio Kitchen verification code is ${code}. Valid for 2 minutes.`,
      ...(statusCallback ? { statusCallback } : {}),
    })

    if (
      message.status === 'failed' ||
      (message.errorCode !== undefined && message.errorCode !== null)
    ) {
      throw new Error(
        `Twilio WhatsApp send failed (status: ${message.status}, error: ${message.errorCode})`
      )
    }

    this.logger.log(
      `OTP WhatsApp sent to ${phone} (sid: ${message.sid}, status: ${message.status})`
    )
  }
}