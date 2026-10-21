import { Injectable, Logger } from '@nestjs/common'
import { OtpService, OtpChannel } from '../../core/entitygateway/OtpService.js'

@Injectable()
export class OtpStubService implements OtpService {
  private readonly logger = new Logger('OtpStubService')

  async sendOtp(phone: string, code: string, channel: OtpChannel): Promise<void> {
    // In development, log the OTP to console instead of sending via WhatsApp/SMS
    this.logger.warn(`========================================`)
    this.logger.warn(`[DEV OTP] Phone: ${phone} | Channel: ${channel} | Code: ${code}`)
    this.logger.warn(`========================================`)

    // Simulate a small delay as if sending via network
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
