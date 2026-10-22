import type { Plan } from '../entities/Plan.js'

export interface PlanLoader {
  getAllPlans(): Promise<Plan[]>
  getActivePlans(): Promise<Plan[]>
  getPlanById(id: string): Promise<Plan | null>
  getPlanBySlug(slug: string): Promise<Plan | null>
}

export interface UpdatePlanPricingRequest {
  priceSar: number
  maxPriceSar: number | null
  pricePerMealSar: number
}

export interface PlanPersistor {
  createPlan(input: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan>
  updatePlanPricing(id: string, request: UpdatePlanPricingRequest): Promise<Plan>
}
