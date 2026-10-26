import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import {
  UserDeviceLoader,
  UserDevicePersistor,
} from '../../core/entitygateway/UserDevice.js'
import { UserDevice } from '../../core/entities/UserDevice.js'
import { dedupeDevicesForPush } from '../../core/usecases/services/pushRecipients.js'
import { UserDeviceModel } from './models/UserDeviceModel.js'

@Injectable()
export class UserDevicePersistenceService
  implements UserDeviceLoader, UserDevicePersistor
{
  async getDevicesByUserId(userId: string): Promise<UserDevice[]> {
    const models = await UserDeviceModel.findAll({
      where: { userId, isActive: true },
      order: [['updatedAt', 'DESC']],
    })
    return dedupeDevicesForPush(models.map(m => this.toEntity(m)))
  }

  async upsertDevice(
    userId: string,
    platform: 'ios' | 'android',
    deviceToken: string,
    endpointArn: string,
    subscriptionArn: string
  ): Promise<UserDevice> {
    const existing = await UserDeviceModel.findOne({
      where: { userId, deviceToken },
      order: [['updatedAt', 'DESC']],
    })
    const model = existing
      ? await existing.update({
          platform,
          endpointArn,
          subscriptionArn,
          isActive: true,
        })
      : await UserDeviceModel.create({
          userId,
          platform,
          deviceToken,
          endpointArn,
          subscriptionArn,
          isActive: true,
        })

    await UserDeviceModel.update(
      { isActive: false },
      {
        where: {
          userId,
          id: { [Op.ne]: model.id },
          [Op.or]: [{ deviceToken }, ...(endpointArn ? [{ endpointArn }] : [])],
        },
      }
    )

    return this.toEntity(model)
  }

  async deactivateDevice(endpointArn: string): Promise<void> {
    await UserDeviceModel.update(
      { isActive: false },
      { where: { endpointArn } }
    )
  }

  async deactivateAllDevicesForUser(userId: string): Promise<void> {
    await UserDeviceModel.update({ isActive: false }, { where: { userId } })
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
