import { UserDevice } from '../entities/UserDevice.js'

export interface UserDeviceLoader {
  getDevicesByUserId(userId: string): Promise<UserDevice[]>
}

export interface UserDevicePersistor {
  upsertDevice(
    userId: string,
    platform: 'ios' | 'android',
    deviceToken: string,
    endpointArn: string,
    subscriptionArn: string
  ): Promise<UserDevice>
  deactivateDevice(endpointArn: string): Promise<void>
}
