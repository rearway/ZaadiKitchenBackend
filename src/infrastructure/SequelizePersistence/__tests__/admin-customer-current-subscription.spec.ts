import {
  AdminCustomerPersistenceService,
  mapCustomerListRow,
} from '../admin-customer-persistence.service.js'
import { DeliveryIssueModel } from '../models/DeliveryIssueModel.js'
import { DeliveryLocationModel } from '../models/DeliveryLocationModel.js'
import { PlanModel } from '../models/PlanModel.js'
import { SubscriptionModel } from '../models/SubscriptionModel.js'
import { UserModel } from '../models/UserModel.js'
import { WalletTransactionModel } from '../models/WalletTransactionModel.js'

const USER_ID = 'user-1'

function subscriptionRow(
  id: string,
  status: string,
  createdAt: string,
  counts: {
    totalMealDays: number
    deliveredCount: number
    skippedCount: number
  }
) {
  return {
    id,
    planId: 'plan-month',
    mealType: 'executive',
    status,
    startDate: '2026-05-01',
    endDate: '2026-06-01',
    skipDaysUsed: 0,
    skipDaysAllowed: 10,
    pauseDaysUsed: 0,
    pauseDaysAllowed: 10,
    createdAt: new Date(createdAt),
    ...counts,
  }
}

describe('admin customer current subscription', () => {
  const service = new AdminCustomerPersistenceService()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('maps list wallet balance and meal-based days left', () => {
    const item = mapCustomerListRow({
      id: USER_ID,
      fullName: 'Noura',
      phone: null,
      email: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      subscriptionStatus: 'active',
      endDate: new Date('2026-11-01T00:00:00.000Z'),
      planName: 'Month Plan',
      walletBalanceSar: '29.00',
      totalMealDays: 22,
      deliveredCount: 4,
      skippedCount: 1,
    })

    expect(item.walletBalanceSar).toBe(29)
    expect(item.subscriptionStatus).toBe('active')
    expect(item.subscription).toEqual({
      status: 'active',
      planName: 'Month Plan',
      endDate: '2026-11-01',
      totalMealDays: 22,
      deliveredCount: 4,
      skippedCount: 1,
      days_remaining: 17,
      mealsLeft: 17,
    })
  })

  it('keeps the older active plan when a newer row is expired', async () => {
    jest.spyOn(UserModel, 'findOne').mockResolvedValue({
      id: USER_ID,
      fullName: 'Noura',
      phone: '+966500000000',
      email: 'noura@example.com',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    } as never)
    jest.spyOn(SubscriptionModel, 'findAll').mockResolvedValue([
      subscriptionRow('sub-expired', 'expired', '2026-09-01', {
        totalMealDays: 5,
        deliveredCount: 5,
        skippedCount: 0,
      }),
      subscriptionRow('sub-active', 'active', '2026-05-01', {
        totalMealDays: 22,
        deliveredCount: 4,
        skippedCount: 1,
      }),
    ] as never)
    jest
      .spyOn(PlanModel, 'findByPk')
      .mockResolvedValue({ name: 'Month Plan' } as never)
    jest
      .spyOn(WalletTransactionModel, 'findOne')
      .mockResolvedValue({ balance: '29.5' } as never)
    jest.spyOn(DeliveryLocationModel, 'findOne').mockResolvedValue(null)
    jest.spyOn(DeliveryIssueModel, 'count').mockResolvedValue(0)

    const detail = await service.getCustomerDetail(USER_ID)

    expect(detail?.walletBalanceSar).toBe(29.5)
    expect(detail?.subscription).toMatchObject({
      id: 'sub-active',
      status: 'active',
      planName: 'Month Plan',
      totalMealDays: 22,
      deliveredCount: 4,
      skippedCount: 1,
      days_remaining: 17,
      mealsLeft: 17,
    })
    expect(detail?.primaryAddress).toBeNull()
  })
})
