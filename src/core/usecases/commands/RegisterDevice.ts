import { Deps } from '../../entitygateway/index.js'
import { UserDevice } from '../../entities/UserDevice.js'

export interface RegisterDeviceInput {
  userId: string
  platform: 'ios' | 'android'
  deviceToken: string
}

export type RegisterDeviceOutput = {
  message: string
  data: UserDevice
}

export function makeUC(deps: Deps) {
  return async function registerDevice(
    input: RegisterDeviceInput
  ): Promise<RegisterDeviceOutput> {
    const { logger, notificationGateway, userDevicePersistor } = deps

    try {
      // 1. Create SNS Platform Endpoint
      const endpointArn = await notificationGateway.createPlatformEndpoint(
        input.platform,
        input.deviceToken,
        input.userId
      )

      // 2. Subscribe endpoint to broadcast topic
      // We expect the topic ARN to be injected or available via config, but since usecase is pure,
      // it should ideally come from environment or we pass it in. For simplicity, we can pass it as a parameter,
      // or we can let the notificationGateway handle the environment specific topic ARN if we just pass a logical topic name.
      // Let's assume we pass the topic name 'broadcast' and the gateway resolves it, or we pass an empty string 
      // if the gateway only has one broadcast topic.
      // Let's update NotificationGateway.subscribeToTopic to just take endpointArn and logical topicName, 
      // or we can fetch it via a Config interface. Let's pass 'broadcast'.
      const subscriptionArn = await notificationGateway.subscribeToTopic(
        endpointArn,
        'broadcast'
      )

      // 3. Save to database
      const device = await userDevicePersistor.upsertDevice(
        input.userId,
        input.platform,
        input.deviceToken,
        endpointArn,
        subscriptionArn
      )

      return {
        message: 'Device registered successfully',
        data: device,
      }
    } catch (error) {
      logger.error(
        'Failed to register device',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'RegisterDevice'
