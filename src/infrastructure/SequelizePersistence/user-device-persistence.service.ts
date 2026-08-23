import { Injectable } from '@nestjs/common'
import {
  UserDeviceLoader,
  UserDevicePersistor,
} from '../../core/entitygateway/UserDevice.js'
import { UserDevice } from '../../core/entities/UserDevice.js'
import { UserDeviceModel } from './models/UserDeviceModel.js'

@Injectable()
export class UserDevicePersistenceService
  implements UserDeviceLoader, UserDevicePersistor
{
  async getDevicesByUserId(userId: string): Promise<UserDevice[]> {
    const models = await UserDeviceModel.findAll({
      where: { userId, isActive: true },
    })
    return models.map(m => this.toEntity(m))
  }

  async upsertDevice(
    userId: string,
    platform: 'ios' | 'android',
    deviceToken: string,
    endpointArn: string,
    subscriptionArn: string
  ): Promise<UserDevice> {
    const [model] = await UserDeviceModel.upsert({
      userId,
      platform,
      deviceToken,
      endpointArn,
      subscriptionArn,
      isActive: true,
    })
    return this.toEntity(model)
  }

  async deactivateDevice(endpointArn: string): Promise<void> {
    await UserDeviceModel.update(
      { isActive: false },
      { where: { endpointArn } }
    )
  }

  private toEntity(model: UserDeviceModel): UserDevice {
    return {
      id: model.id,
      userId: model.userId,
      platform: model.platform,
      deviceToken: model.deviceToken,
      endpointArn: model.endpointArn,
      subscriptionArn: model.subscriptionArn,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
