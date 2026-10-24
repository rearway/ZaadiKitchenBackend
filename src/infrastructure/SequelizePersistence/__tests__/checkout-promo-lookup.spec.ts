import { CheckoutSessionPersistenceService } from '../checkout-session-persistence.service.js'
import { PromoCodeModel } from '../models/PromoCodeModel.js'
import { UserModel } from '../models/UserModel.js'

describe('CheckoutSessionPersistenceService.getPromoByCode', () => {
  const service = new CheckoutSessionPersistenceService()
  const createdAt = new Date('2026-01-01T00:00:00Z')
  const updatedAt = new Date('2026-01-02T00:00:00Z')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('resolves a referral code issued on the user when promo_codes has no row', async () => {
    jest.spyOn(PromoCodeModel, 'findOne').mockResolvedValue(null as never)
    jest.spyOn(UserModel, 'findOne').mockResolvedValue({
      id: 'referrer-uuid',
      referralCode: 'QAREF6964',
      createdAt,
      updatedAt,
    } as never)

    const promo = await service.getPromoByCode('QAREF6964')

    expect(promo).toMatchObject({
      code: 'QAREF6964',
      type: 'referral',
      ownerUserId: 'referrer-uuid',
      isActive: true,
      maxUses: null,
      timesUsed: 0,
      validForPlanSlug: null,
      discountSar: 0,
    })
  })

  it('matches an issued referral code case-insensitively and returns the stored code', async () => {
    jest.spyOn(PromoCodeModel, 'findOne').mockResolvedValue(null as never)
    const findUser = jest
      .spyOn(UserModel, 'findOne')
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        id: 'referrer-uuid',
        referralCode: 'QAREF6964',
        createdAt,
        updatedAt,
      } as never)

    const promo = await service.getPromoByCode('qaref6964')

    expect(findUser).toHaveBeenCalledTimes(2)
    expect(promo).toMatchObject({
      code: 'QAREF6964',
      type: 'referral',
      ownerUserId: 'referrer-uuid',
    })
  })

  it('returns null when the code is neither a promo nor an issued referral', async () => {
    jest.spyOn(PromoCodeModel, 'findOne').mockResolvedValue(null as never)
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(null as never)

    await expect(service.getPromoByCode('NOTACODE')).resolves.toBeNull()
  })

  it('keeps an active promo_codes row ahead of a user referral code', async () => {
    jest.spyOn(PromoCodeModel, 'findOne').mockResolvedValue({
      id: 'promo-1',
      code: 'SAVE10',
      type: 'promo',
      discountSar: '10.00',
      ownerUserId: null,
      validForPlanSlug: null,
      maxUses: null,
      timesUsed: 1,
      isActive: true,
      createdAt,
      updatedAt,
    } as never)
    const findUser = jest.spyOn(UserModel, 'findOne')

    const promo = await service.getPromoByCode('SAVE10')

    expect(promo).toMatchObject({
      id: 'promo-1',
      code: 'SAVE10',
      type: 'promo',
      discountSar: 10,
    })
    expect(findUser).not.toHaveBeenCalled()
  })
})
