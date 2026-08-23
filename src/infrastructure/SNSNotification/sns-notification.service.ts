import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  SNSClient,
  CreatePlatformEndpointCommand,
  SubscribeCommand,
  PublishCommand,
} from '@aws-sdk/client-sns'
import { NotificationGateway } from '../../core/entitygateway/Notification.js'
import { LoggerService } from '../Logger/index.js'

@Injectable()
export class SnsNotificationService implements NotificationGateway {
  private snsClient: SNSClient

  constructor(
    private configService: ConfigService,
    private logger: LoggerService
  ) {
    this.snsClient = new SNSClient({
      region: this.configService.get<string>('AWS_REGION', 'me-south-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          ''
        ),
      },
    })
  }

  async notify(userId: string, message: string): Promise<void> {
    // Legacy fallback, we should prefer sendSingleNotification
    this.logger.log(`notify called for userId: ${userId} with message: ${message}`)
  }

  async createPlatformEndpoint(
    platform: 'ios' | 'android',
    deviceToken: string,
    userId: string
  ): Promise<string> {
    const platformAppArn =
      platform === 'ios'
        ? this.configService.get<string>('SNS_PLATFORM_APP_ARN_APNS', '')
        : this.configService.get<string>('SNS_PLATFORM_APP_ARN_GCM', '')

    if (!platformAppArn) {
      throw new Error(`Platform Application ARN not configured for ${platform}`)
    }

    try {
      const command = new CreatePlatformEndpointCommand({
        PlatformApplicationArn: platformAppArn,
        Token: deviceToken,
        CustomUserData: userId,
      })
      const response = await this.snsClient.send(command)
      return response.EndpointArn!
    } catch (error) {
      this.logger.error('Failed to create SNS Platform Endpoint', String(error))
      throw error
    }
  }

  async subscribeToTopic(
    endpointArn: string,
    topicName: string
  ): Promise<string> {
    try {
      let topicArn = topicName
      if (topicName === 'broadcast') {
        topicArn = this.configService.get<string>('SNS_BROADCAST_TOPIC_ARN', '')
      }

      if (!topicArn) throw new Error(`Topic ARN not configured for ${topicName}`)

      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'application',
        Endpoint: endpointArn,
      })
      const response = await this.snsClient.send(command)
      return response.SubscriptionArn!
    } catch (error) {
      this.logger.error('Failed to subscribe endpoint to topic', String(error))
      throw error
    }
  }

  async sendSingleNotification(
    endpointArn: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      // In a real app we might construct APNS/GCM specific payloads
      const payload = {
        default: body,
        APNS: JSON.stringify({
          aps: { alert: { title, body } },
          data,
        }),
        GCM: JSON.stringify({
          notification: { title, body },
          data,
        }),
      }

      const command = new PublishCommand({
        TargetArn: endpointArn,
        Message: JSON.stringify(payload),
        MessageStructure: 'json',
      })
      await this.snsClient.send(command)
    } catch (error: any) {
      this.logger.error('Failed to send single push notification', String(error))
      if (error.name === 'EndpointDisabledException') {
        throw new Error('EndpointDisabled')
      }
      throw error
    }
  }

  async publishToTopic(
    topicName: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      let topicArn = topicName
      if (topicName === 'broadcast') {
        topicArn = this.configService.get<string>('SNS_BROADCAST_TOPIC_ARN', '')
      }

      if (!topicArn) throw new Error(`Topic ARN not configured for ${topicName}`)

      const payload = {
        default: body,
        APNS: JSON.stringify({
          aps: { alert: { title, body } },
          data,
        }),
        GCM: JSON.stringify({
          notification: { title, body },
          data,
        }),
      }

      const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(payload),
        MessageStructure: 'json',
      })
      await this.snsClient.send(command)
    } catch (error) {
      this.logger.error('Failed to publish bulk notification', String(error))
      throw error
    }
  }
}
