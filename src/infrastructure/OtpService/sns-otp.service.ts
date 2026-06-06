import { Injectable, Logger } from '@nestjs/common'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { OtpService } from '../../core/entitygateway/OtpService.js'

@Injectable()
export class SnsOtpService implements OtpService {
  private readonly logger = new Logger('SnsOtpService')
  private readonly sns = new SNSClient({ region: 'ap-south-1' })

  async sendOtp(phone: string, code: string): Promise<void> {
    const command = new PublishCommand({
      PhoneNumber: phone,
      Message: `Your Zaadi Kitchen verification code is: ${code}. Valid for 2 minutes.`,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    })

    const result = await this.sns.send(command)
    this.logger.log(`OTP SMS sent to ${phone} (MessageId: ${result.MessageId})`)
  }
}
