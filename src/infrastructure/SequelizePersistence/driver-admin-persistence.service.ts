import { Injectable } from '@nestjs/common'
import { Op, type Transaction } from 'sequelize'

import { UserRole } from '../../codecs/enums.js'
import type {
  AssignedArea,
  CreateDriverRecord,
  DriverAdminLoader,
  DriverAdminPersistor,
  DriverSummary,
  UpdateDriverRecord,
} from '../../core/entitygateway/DriverAdmin.js'
import {
  DeliveryAreaModel,
  DriverAreaAssignmentModel,
  UserModel,
} from './models/index.js'

@Injectable()
export class DriverAdminPersistenceService
  implements DriverAdminLoader, DriverAdminPersistor
{
  async listDrivers(): Promise<DriverSummary[]> {
    const users = await UserModel.findAll({
      where: { role: UserRole.DRIVER, deletedAt: null },
      order: [['fullName', 'ASC']],
    })
    const areasByDriver = await this.areasFor(users.map(user => user.id))
    return users.map(user =>
      this.toSummary(user, areasByDriver.get(user.id) ?? [])
    )
  }

  async getDriverById(driverId: string): Promise<DriverSummary | null> {
    const user = await UserModel.findOne({
      where: { id: driverId, role: UserRole.DRIVER, deletedAt: null },
    })
    if (!user) return null
    const areasByDriver = await this.areasFor([user.id])
    return this.toSummary(user, areasByDriver.get(user.id) ?? [])
  }

  async getAssignedAreaIds(driverId: string): Promise<string[]> {
    const rows = await DriverAreaAssignmentModel.findAll({
      where: { driverId },
      attributes: ['areaId'],
    })
    return rows.map(row => row.areaId)
  }

  async createDriver(request: CreateDriverRecord): Promise<DriverSummary> {
    const sequelize = UserModel.sequelize!
    return sequelize.transaction(async transaction => {
      const user = await UserModel.create(
        {
          phone: request.phone,
          email: null,
          password: null,
          fullName: request.fullName,
          role: UserRole.DRIVER,
          languagePreference: 'EN',
          isActive: true,
        },
        { transaction }
      )
      await this.insertAreas(user.id, request.areaIds, transaction)
      const areas = await this.namedAreas(request.areaIds, transaction)
      return this.toSummary(user, areas)
    })
  }

  async updateDriver(
    driverId: string,
    updates: UpdateDriverRecord
  ): Promise<DriverSummary> {
    const sequelize = UserModel.sequelize!
    return sequelize.transaction(async transaction => {
      const user = await UserModel.findOne({
        where: { id: driverId, role: UserRole.DRIVER, deletedAt: null },
        transaction,
      })
      if (!user) {
        throw new Error(`Driver with id '${driverId}' not found`)
      }

      const fields: Record<string, unknown> = {}
      if (updates.fullName !== undefined) fields.fullName = updates.fullName
      if (updates.phone !== undefined) fields.phone = updates.phone
      if (updates.isActive !== undefined) fields.isActive = updates.isActive
      if (Object.keys(fields).length > 0) {
        await user.update(fields, { transaction })
      }

      if (updates.areaIds !== undefined) {
        await DriverAreaAssignmentModel.destroy({
          where: { driverId },
          transaction,
        })
        await this.insertAreas(driverId, updates.areaIds, transaction)
      }

      const areaIds =
        updates.areaIds ??
        (
          await DriverAreaAssignmentModel.findAll({
            where: { driverId },
            attributes: ['areaId'],
            transaction,
          })
        ).map(row => row.areaId)
      const areas = await this.namedAreas(areaIds, transaction)
      return this.toSummary(user, areas)
    })
  }

  async softDeleteDriver(driverId: string): Promise<Date> {
    const sequelize = UserModel.sequelize!
    return sequelize.transaction(async transaction => {
      const user = await UserModel.findOne({
        where: { id: driverId, role: UserRole.DRIVER, deletedAt: null },
        transaction,
      })
      if (!user) {
        throw new Error(`Driver with id '${driverId}' not found`)
      }

      const deletedAt = new Date()
      await user.update(
        {
          isActive: false,
          deletedAt,
          phone: `deleted:${driverId}`,
          pushNotificationToken: null,
        },
        { transaction }
      )
      await DriverAreaAssignmentModel.destroy({
        where: { driverId },
        transaction,
      })
      return deletedAt
    })
  }

  private async insertAreas(
    driverId: string,
    areaIds: string[],
    transaction: Transaction
  ): Promise<void> {
    if (areaIds.length === 0) return
    await DriverAreaAssignmentModel.bulkCreate(
      areaIds.map(areaId => ({ driverId, areaId })),
      { transaction }
    )
  }

  private async namedAreas(
    areaIds: string[],
    transaction?: Transaction
  ): Promise<AssignedArea[]> {
    if (areaIds.length === 0) return []
    const areas = await DeliveryAreaModel.findAll({
      where: { id: { [Op.in]: areaIds }, deletedAt: null },
      transaction,
    })
    return areas
      .map(area => ({ id: area.id, name: area.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  private async areasFor(
    driverIds: string[]
  ): Promise<Map<string, AssignedArea[]>> {
    const map = new Map<string, AssignedArea[]>()
    if (driverIds.length === 0) return map

    const assignments = await DriverAreaAssignmentModel.findAll({
      where: { driverId: { [Op.in]: driverIds } },
    })
    const areas = await this.namedAreas(assignments.map(row => row.areaId))
    const byId = new Map(areas.map(area => [area.id, area]))

    for (const row of assignments) {
      const area = byId.get(row.areaId)
      if (!area) continue
      const list = map.get(row.driverId) ?? []
      list.push(area)
      map.set(row.driverId, list)
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }

  private toSummary(user: UserModel, areas: AssignedArea[]): DriverSummary {
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      areas,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
