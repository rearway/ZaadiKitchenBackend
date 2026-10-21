import { Injectable } from '@nestjs/common'

import type { OtpChannel, OtpService } from '../../core/entitygateway/OtpService.js'
import { SnsOtpService } from './sns-otp.service.js'
import { TwilioWhatsAppOtpService } from './twilio-whatsapp-otp.service.js'

@Injectable()
export class RoutingOtpService implements OtpService {
  constructor(
    private readonly snsOtpService: SnsOtpService,
    private readonly twilioWhatsAppOtpService: TwilioWhatsAppOtpService
  ) {}

  async sendOtp(phone: string, code: string, channel: OtpChannel): Promise<void> {
    if (channel === 'whatsapp') {
      await this.twilioWhatsAppOtpService.sendOtp(phone, code, channel)
      return
    }
    await this.snsOtpService.sendOtp(phone, code, channel)
  }
}
