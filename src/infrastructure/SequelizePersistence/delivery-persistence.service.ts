import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import {
  DeliveryAreaLoader,
  BuildingLoader,
  BuildingPersistor,
  OutOfZoneInterestPersistor,
  DeliveryLocationPersistor,
  DeliveryAreaPersistor,
  DeliveryLocationLoader,
} from '../../core/entitygateway/Delivery.js'
import {
  DeliveryArea,
  Building,
  OutOfZoneInterest,
  DeliveryLocation,
} from '../../core/entities/Delivery.js'
import {
  DeliveryAreaModel,
  BuildingModel,
  OutOfZoneInterestModel,
  DeliveryLocationModel,
} from './models/index.js'

@Injectable()
export class DeliveryPersistenceService
  implements
    DeliveryAreaLoader,
    BuildingLoader,
    BuildingPersistor,
    OutOfZoneInterestPersistor,
    DeliveryLocationPersistor,
    DeliveryAreaPersistor,
    DeliveryLocationLoader
{
  async getActiveAreas(): Promise<DeliveryArea[]> {
    const models = await DeliveryAreaModel.findAll({
      where: { status: 'active' },
      order: [['name', 'ASC']],
    })
    return models.map(m => this.toDeliveryAreaEntity(m))
  }

  async getAllAreas(status?: string): Promise<DeliveryArea[]> {
    const whereClause: { status?: string } = {}
    if (status) {
      whereClause.status = status
    }
    const models = await DeliveryAreaModel.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    })
    return models.map(m => this.toDeliveryAreaEntity(m))
  }

  async searchActiveAreas(query: string): Promise<DeliveryArea[]> {
    const models = await DeliveryAreaModel.findAll({
      where: {
        status: 'active',
        name: { [Op.iLike]: `%${query}%` },
      },
      order: [['name', 'ASC']],
    })
    return models.map(m => this.toDeliveryAreaEntity(m))
  }

  async getAreaById(areaId: string): Promise<DeliveryArea | null> {
    const model = await DeliveryAreaModel.findByPk(areaId)
    return model ? this.toDeliveryAreaEntity(model) : null
  }

  async createDeliveryArea(
    request: Partial<DeliveryArea>
  ): Promise<DeliveryArea> {
    const model = await DeliveryAreaModel.create({
      name: request.name!,
      description: request.description,
      status: request.status || 'active',
    })
    return this.toDeliveryAreaEntity(model)
  }

  async getBuildingsByArea(areaId: string): Promise<Building[]> {
    const models = await BuildingModel.findAll({
      where: { areaId },
      order: [['name', 'ASC']],
    })
    return models.map(m => this.toBuildingEntity(m))
  }

  async searchBuildingsByArea(
    areaId: string,
    query: string
  ): Promise<Building[]> {
    const models = await BuildingModel.findAll({
      where: {
        areaId,
        name: { [Op.iLike]: `%${query}%` },
      },
      order: [['name', 'ASC']],
    })
    return models.map(m => this.toBuildingEntity(m))
  }

  async getBuildingById(buildingId: string): Promise<Building | null> {
    const model = await BuildingModel.findByPk(buildingId)
    return model ? this.toBuildingEntity(model) : null
  }

  async createBuilding(request: Partial<Building>): Promise<Building> {
    const model = await BuildingModel.create({
      areaId: request.areaId!,
      name: request.name!,
      floorsCount: request.floorsCount,
    })
    return this.toBuildingEntity(model)
  }

  async createInterest(
    userId: string,
    areaName: string
  ): Promise<OutOfZoneInterest> {
    const model = await OutOfZoneInterestModel.create({
      userId,
      areaName,
    })
    return this.toOutOfZoneInterestEntity(model)
  }

  async getUserInterestCount(userId: string): Promise<number> {
    return OutOfZoneInterestModel.count({ where: { userId } })
  }

  async createLocation(
    request: Partial<DeliveryLocation>
  ): Promise<DeliveryLocation> {
    // If isPrimary is true, unset other primary locations for this user
    if (request.isPrimary) {
      await DeliveryLocationModel.update(
        { isPrimary: false },
        { where: { userId: request.userId! } }
      )
    }

    const model = await DeliveryLocationModel.create({ ...request })
    return this.toDeliveryLocationEntity(model)
  }

  async getPrimaryLocationByUserId(
    userId: string
  ): Promise<DeliveryLocation | null> {
    const model = await DeliveryLocationModel.findOne({
      where: { userId, isPrimary: true },
    })
    return model ? this.toDeliveryLocationEntity(model) : null
  }

  async getLocationsByUserId(userId: string): Promise<DeliveryLocation[]> {
    const models = await DeliveryLocationModel.findAll({
      where: { userId },
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']],
    })
    return models.map(m => this.toDeliveryLocationEntity(m))
  }

  private toDeliveryAreaEntity(model: DeliveryAreaModel): DeliveryArea {
    return {
      id: model.id,
      name: model.name,
      description: model.description || undefined,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  private toBuildingEntity(model: BuildingModel): Building {
    return {
      id: model.id,
      areaId: model.areaId,
      name: model.name,
      floorsCount: model.floorsCount || undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  private toOutOfZoneInterestEntity(
    model: OutOfZoneInterestModel
  ): OutOfZoneInterest {
    return {
      id: model.id,
      userId: model.userId,
      areaName: model.areaName,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  private toDeliveryLocationEntity(
    model: DeliveryLocationModel
  ): DeliveryLocation {
    return {
      id: model.id,
      userId: model.userId,
      areaId: model.areaId,
      buildingId: model.buildingId || undefined,
      buildingName: model.buildingName,
      floor: model.floor || undefined,
      deskArea: model.deskArea || undefined,
      deliveryPreference: model.deliveryPreference,
      riderNotes: model.riderNotes || undefined,
      isPrimary: model.isPrimary,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
