import { Injectable, Logger } from '@nestjs/common'
import { OtpService } from '../../core/entitygateway/OtpService'

@Injectable()
export class OtpStubService implements OtpService {
    private readonly logger = new Logger('OtpStubService')

    async sendOtp(phone: string, code: string): Promise<void> {
        // In development, log the OTP to console instead of sending via WhatsApp/SMS
        this.logger.warn(
            `========================================`
        )
        this.logger.warn(
            `[DEV OTP] Phone: ${phone} | Code: ${code}`
        )
        this.logger.warn(
            `========================================`
        )

        // Simulate a small delay as if sending via network
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}
