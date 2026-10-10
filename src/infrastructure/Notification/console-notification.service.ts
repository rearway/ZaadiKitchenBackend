import { Injectable } from '@nestjs/common'
import type { NotificationGateway } from '../../core/entitygateway/Notification.js'

/**
 * Stands in for a real push provider (FCM, APNs, etc.). No provider is
 * wired up yet — this just logs so the calling business logic (issue
 * resolution, pipeline advance, broadcasts) can be built and tested now.
 * Replace with a real NotificationService by swapping the binding in
 * coreadapter.module.ts — no other code changes needed.
 */
@Injectable()
export class ConsoleNotificationService implements NotificationGateway {
  async notify(userId: string, message: string): Promise<void> {
    console.log(`[Notification] To ${userId}: ${message}`)
  }

  async createPlatformEndpoint(platform: 'ios' | 'android', deviceToken: string, userId: string): Promise<string> {
    console.log(`[Notification] createPlatformEndpoint for ${userId} on ${platform}`)
    return `arn:aws:sns:mock:endpoint/${userId}`
  }

  async subscribeToTopic(endpointArn: string, topicName: string): Promise<string> {
    console.log(`[Notification] subscribeToTopic ${endpointArn} to ${topicName}`)
    return `arn:aws:sns:mock:subscription/${topicName}`
  }

  async sendSingleNotification(endpointArn: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    console.log(`[Notification] sendSingleNotification to ${endpointArn}: ${title} - ${body}`)
  }

  async publishToTopic(topicName: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    console.log(`[Notification] publishToTopic ${topicName}: ${title} - ${body}`)
  }
}
