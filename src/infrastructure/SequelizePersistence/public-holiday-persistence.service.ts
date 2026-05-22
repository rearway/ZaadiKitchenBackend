import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'
import {
  PublicHolidayLoader,
  PublicHolidayPersistor,
} from '../../core/entitygateway/PublicHoliday.js'
import { PublicHoliday } from '../../core/entities/PublicHoliday.js'
import { PublicHolidayModel } from './models/index.js'

@Injectable()
export class PublicHolidayPersistenceService
  implements PublicHolidayLoader, PublicHolidayPersistor
{
  async getHolidaysByYear(year: number): Promise<PublicHoliday[]> {
    const models = await PublicHolidayModel.findAll({
      where: {
        date: {
          [Op.between]: [`${year}-01-01`, `${year}-12-31`],
        },
      },
      order: [['date', 'ASC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getHolidayDates(from: string, to: string): Promise<string[]> {
    const models = await PublicHolidayModel.findAll({
      where: { date: { [Op.between]: [from, to] } },
      attributes: ['date'],
    })
    return models.map(m => m.date)
  }

  async createHoliday(
    input: Omit<PublicHoliday, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PublicHoliday> {
    const model = await PublicHolidayModel.create({ ...input })
    return this.toEntity(model)
  }

  private toEntity(model: PublicHolidayModel): PublicHoliday {
    return {
      id: model.id,
      date: model.date,
      name: model.name,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
