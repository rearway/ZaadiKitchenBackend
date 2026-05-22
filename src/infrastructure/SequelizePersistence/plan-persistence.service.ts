import { Injectable } from '@nestjs/common'
import { PlanLoader, PlanPersistor } from '../../core/entitygateway/Plan.js'
import { Plan } from '../../core/entities/Plan.js'
import { PlanModel } from './models/index.js'

@Injectable()
export class PlanPersistenceService implements PlanLoader, PlanPersistor {
  async getAllPlans(): Promise<Plan[]> {
    const models = await PlanModel.findAll({ order: [['priceSar', 'ASC']] })
    return models.map(m => this.toEntity(m))
  }

  async getActivePlans(): Promise<Plan[]> {
    const models = await PlanModel.findAll({
      where: { isActive: true },
      order: [['priceSar', 'ASC']],
    })
    return models.map(m => this.toEntity(m))
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const model = await PlanModel.findByPk(id)
    return model ? this.toEntity(model) : null
  }

  async getPlanBySlug(slug: string): Promise<Plan | null> {
    const model = await PlanModel.findOne({ where: { slug } })
    return model ? this.toEntity(model) : null
  }

  async createPlan(
    input: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Plan> {
    const model = await PlanModel.create({ ...input })
    return this.toEntity(model)
  }

  private toEntity(model: PlanModel): Plan {
    return {
      id: model.id,
      name: model.name,
      slug: model.slug,
      priceSar: Number(model.priceSar),
      mealCount: model.mealCount,
      pricePerMealSar: Number(model.pricePerMealSar),
      skipDaysAllowed: model.skipDaysAllowed,
      pauseDaysAllowed: model.pauseDaysAllowed,
      isMostPopular: model.isMostPopular,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }
}
