import { Injectable } from '@nestjs/common'
import { Op, QueryTypes } from 'sequelize'
import {
  DeliveryAreaLoader,
  BuildingLoader,
  BuildingPersistor,
  OutOfZoneInterestPersistor,
  OutOfZoneInterestLoader,
  AggregatedOutOfZoneRequest,
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
    DeliveryAreaPersistor,
    BuildingLoader,
    BuildingPersistor,
    OutOfZoneInterestPersistor,
    OutOfZoneInterestLoader,
    DeliveryLocationPersistor,
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

  async getAreaByName(
    name: string,
    excludeId?: string
  ): Promise<DeliveryArea | null> {
    const where: Record<string, unknown> = { name: { [Op.iLike]: name } }
    if (excludeId) where['id'] = { [Op.ne]: excludeId }
    const model = await DeliveryAreaModel.findOne({ where })
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

  async updateDeliveryArea(
    id: string,
    data: Partial<DeliveryArea>
  ): Promise<DeliveryArea> {
    const model = await DeliveryAreaModel.findByPk(id)
    if (!model) throw new Error(`DeliveryArea ${id} not found`)
    await model.update(data)
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

  async updateBuilding(id: string, data: { name: string }): Promise<Building> {
    const model = await BuildingModel.findByPk(id)
    if (!model) throw new Error(`Building ${id} not found`)
    await model.update({ name: data.name })
    return this.toBuildingEntity(model)
  }

  async deleteBuilding(id: string): Promise<void> {
    await BuildingModel.destroy({ where: { id } })
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

  async getLocationById(id: string): Promise<DeliveryLocation | null> {
    const model = await DeliveryLocationModel.findByPk(id)
    return model ? this.toDeliveryLocationEntity(model) : null
  }

  async updateLocation(
    id: string,
    data: Partial<DeliveryLocation>
  ): Promise<DeliveryLocation> {
    const model = await DeliveryLocationModel.findByPk(id)
    if (!model) throw new Error(`DeliveryLocation ${id} not found`)
    await model.update(data)
    return this.toDeliveryLocationEntity(model)
  }

  async deleteLocation(id: string): Promise<void> {
    const model = await DeliveryLocationModel.findByPk(id)
    if (!model) return
    const userId = model.userId
    const wasPrimary = model.isPrimary
    await model.destroy()

    if (wasPrimary) {
      const next = await DeliveryLocationModel.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
      })
      if (next) await next.update({ isPrimary: true })
    }
  }

  async setPrimaryLocation(id: string, userId: string): Promise<void> {
    await DeliveryLocationModel.update(
      { isPrimary: false },
      { where: { userId } }
    )
    await DeliveryLocationModel.update({ isPrimary: true }, { where: { id } })
  }

  async getLocationsByUserId(userId: string): Promise<DeliveryLocation[]> {
    const models = await DeliveryLocationModel.findAll({
      where: { userId },
      order: [
        ['isPrimary', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    })
    return models.map(m => this.toDeliveryLocationEntity(m))
  }

  async getAggregatedRequests(
    page: number,
    perPage: number
  ): Promise<{
    areas: AggregatedOutOfZoneRequest[]
    total: number
    totalRequests: number
  }> {
    const sequelize = OutOfZoneInterestModel.sequelize!
    const offset = (page - 1) * perPage

    const [countRow] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(DISTINCT area_name) as count FROM out_of_zone_interests`,
      { type: QueryTypes.SELECT }
    )
    const total = parseInt(countRow.count, 10)

    const totalRequests = await OutOfZoneInterestModel.count()

    const rows = await sequelize.query<{
      area_name: string
      request_count: string
      first_requested: string
      last_requested: string
    }>(
      `SELECT area_name,
              COUNT(*) as request_count,
              MIN(created_at) as first_requested,
              MAX(created_at) as last_requested
       FROM out_of_zone_interests
       GROUP BY area_name
       ORDER BY request_count DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit: perPage, offset },
        type: QueryTypes.SELECT,
      }
    )

    const areas: AggregatedOutOfZoneRequest[] = rows.map(r => ({
      area_name: r.area_name,
      request_count: parseInt(r.request_count as any, 10),
      first_requested: String(r.first_requested).split('T')[0],
      last_requested: String(r.last_requested).split('T')[0],
    }))

    return { areas, total, totalRequests }
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
