import type { PromoCode } from '../entities/PromoCode.js'

export interface PromoCodeLoader {
  getPromoByCode(code: string): Promise<PromoCode | null>
}

export interface PromoCodePersistor {
  createPromo(
    input: Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PromoCode>
  incrementTimesUsed(code: string): Promise<void>
}
