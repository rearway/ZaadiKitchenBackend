import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import twilio from 'twilio'

import type { OtpChannel, OtpService } from '../../core/entitygateway/OtpService.js'

@Injectable()
export class TwilioWhatsAppOtpService implements OtpService {
  private readonly logger = new Logger(TwilioWhatsAppOtpService.name)
  private readonly client: ReturnType<typeof twilio> | null
  private readonly from: string | null
  private readonly contentSid: string | null

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
    this.from = this.configService.get<string>('TWILIO_WHATSAPP_FROM') || null
    this.contentSid =
      this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID') || null
    this.client = accountSid && authToken ? twilio(accountSid, authToken) : null
  }

  async sendOtp(phone: string, code: string, _channel: OtpChannel): Promise<void> {
    if (!this.client || !this.from) {
      throw new Error(
        'Twilio WhatsApp is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)'
      )
    }

    const from = this.from.startsWith('whatsapp:') ? this.from : `whatsapp:${this.from}`
    const to = `whatsapp:${phone}`

    // Outside the 24h session window (production) WhatsApp only delivers approved templates.
    const message = this.contentSid
      ? await this.client.messages.create({
          from,
          to,
          contentSid: this.contentSid,
          contentVariables: JSON.stringify({ '1': code }),
        })
      : await this.client.messages.create({
          from,
          to,
          body: `Your Platio Kitchen verification code is ${code}. Valid for 2 minutes.`,
        })

    this.logger.log(`OTP WhatsApp sent to ${phone} (sid: ${message.sid}, status: ${message.status})`)
  }
}
