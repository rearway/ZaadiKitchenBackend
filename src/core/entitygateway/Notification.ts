export interface NotificationGateway {
  notify(userId: string, message: string): Promise<void>
  createPlatformEndpoint(platform: 'ios' | 'android', deviceToken: string, userId: string): Promise<string>
  subscribeToTopic(endpointArn: string, topicName: string): Promise<string>
  sendSingleNotification(endpointArn: string, title: string, body: string, data?: Record<string, any>): Promise<void>
  publishToTopic(topicName: string, title: string, body: string, data?: Record<string, any>): Promise<void>
}
