import { QueryTypes } from 'sequelize'
import { AdminCustomerPersistenceService } from '../admin-customer-persistence.service.js'
import { DeliveryDayModel } from '../models/DeliveryDayModel.js'
import { DeliveryIssueModel } from '../models/DeliveryIssueModel.js'
import { PlanModel } from '../models/PlanModel.js'
import { SubscriptionModel } from '../models/SubscriptionModel.js'

const USER_ID = 'user-1'

function subscription(id: string, planId: string) {
  return {
    id,
    planId,
    mealType: 'executive',
    status: 'active',
    startDate: '2026-05-01',
    endDate: '2026-06-01',
    deliveredCount: 4,
    skippedCount: 1,
  }
}

describe('AdminCustomerPersistenceService.getCustomerHistory issues', () => {
  const service = new AdminCustomerPersistenceService()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function stubReads(issues: unknown[], meals: unknown[] = []) {
    jest
      .spyOn(SubscriptionModel, 'findAll')
      .mockResolvedValue([
        subscription('sub-1', 'plan-month'),
        subscription('sub-2', 'plan-week'),
      ] as never)
    jest.spyOn(PlanModel, 'findAll').mockResolvedValue([
      { id: 'plan-month', name: 'Month Plan' },
      { id: 'plan-week', name: 'Week Plan' },
    ] as never)
    jest.spyOn(DeliveryIssueModel, 'findAll').mockResolvedValue(issues as never)

    const query = jest.fn((sql: string) => {
      if (sql.includes('dd.id')) {
        return [
          {
            id: 'dd-1',
            date: '2026-05-05',
            status: 'delivered',
            meal_type: 'executive',
            meal_name: 'Ignored Snapshot',
          },
        ]
      }
      return meals
    })
    Object.defineProperty(DeliveryDayModel, 'sequelize', {
      configurable: true,
      value: { query },
    })
    return query
  }

  it('includes the issue body, rejection notes, and resolvedAt from updated_at when the issue is not open', async () => {
    const createdAt = new Date('2026-05-05T09:00:00Z')
    const creditedAt = new Date('2026-05-05T14:10:00Z')
    const rejectedAt = new Date('2026-05-06T11:00:00Z')
    const openUpdatedAt = new Date('2026-05-07T08:00:00Z')

    stubReads([
      {
        id: 'iss-credited',
        subscriptionId: 'sub-1',
        deliveryDate: '2026-05-05',
        issueType: 'quality_issue',
        status: 'credited',
        description: 'Soup arrived cold.',
        creditedAmountSar: '28.50',
        rejectionReason: null,
        rejectionNotes: null,
        createdAt,
        updatedAt: creditedAt,
      },
      {
        id: 'iss-rejected',
        subscriptionId: 'sub-2',
        deliveryDate: '2026-05-06',
        issueType: 'wrong_order',
        status: 'rejected',
        description: 'Received a salad.',
        creditedAmountSar: null,
        rejectionReason: 'Unable to verify.',
        rejectionNotes: 'Kitchen confirmed the correct bag.',
        createdAt,
        updatedAt: rejectedAt,
      },
      {
        id: 'iss-open',
        subscriptionId: 'sub-1',
        deliveryDate: '2026-05-07',
        issueType: 'not_delivered',
        status: 'open',
        description: null,
        creditedAmountSar: null,
        rejectionReason: null,
        rejectionNotes: null,
        createdAt,
        updatedAt: openUpdatedAt,
      },
    ])

    const { issues } = await service.getCustomerHistory(USER_ID)

    expect(
      issues.map(issue => ({
        id: issue.id,
        deliveryDate: issue.deliveryDate,
        issueType: issue.issueType,
        status: issue.status,
        creditedAmountSar: issue.creditedAmountSar,
        rejectionReason: issue.rejectionReason,
        createdAt: issue.createdAt,
        description: issue.description,
        rejectionNotes: issue.rejectionNotes,
        resolvedAt: issue.resolvedAt,
      }))
    ).toEqual([
      {
        id: 'iss-credited',
        deliveryDate: '2026-05-05',
        issueType: 'quality_issue',
        status: 'credited',
        creditedAmountSar: 28.5,
        rejectionReason: null,
        createdAt,
        description: 'Soup arrived cold.',
        rejectionNotes: null,
        resolvedAt: creditedAt,
      },
      {
        id: 'iss-rejected',
        deliveryDate: '2026-05-06',
        issueType: 'wrong_order',
        status: 'rejected',
        creditedAmountSar: null,
        rejectionReason: 'Unable to verify.',
        createdAt,
        description: 'Received a salad.',
        rejectionNotes: 'Kitchen confirmed the correct bag.',
        resolvedAt: rejectedAt,
      },
      {
        id: 'iss-open',
        deliveryDate: '2026-05-07',
        issueType: 'not_delivered',
        status: 'open',
        creditedAmountSar: null,
        rejectionReason: null,
        createdAt,
        description: null,
        rejectionNotes: null,
        resolvedAt: null,
      },
    ])
  })

  it('attaches subscriptionId, the subscription plan name, and the delivery-day meal name', async () => {
    const createdAt = new Date('2026-05-05T09:00:00Z')
    const query = stubReads(
      [
        {
          id: 'iss-1',
          subscriptionId: 'sub-1',
          deliveryDate: '2026-05-05',
          issueType: 'quality_issue',
          status: 'open',
          description: 'Cold soup',
          creditedAmountSar: null,
          rejectionReason: null,
          rejectionNotes: null,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 'iss-2',
          subscriptionId: 'sub-2',
          deliveryDate: '2026-05-05',
          issueType: 'damaged',
          status: 'open',
          description: 'Lid crushed',
          creditedAmountSar: null,
          rejectionReason: null,
          rejectionNotes: null,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 'iss-orphan',
          subscriptionId: 'sub-missing',
          deliveryDate: '2026-04-01',
          issueType: 'not_delivered',
          status: 'open',
          description: null,
          creditedAmountSar: null,
          rejectionReason: null,
          rejectionNotes: null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      [
        {
          subscription_id: 'sub-1',
          date: '2026-05-05',
          meal_name: 'Lamb Kabsa',
        },
        {
          subscription_id: 'sub-2',
          date: '2026-05-05',
          meal_name: 'Chicken Biryani',
        },
      ]
    )

    const { issues, deliveries } = await service.getCustomerHistory(USER_ID)

    expect(
      issues.map(issue => ({
        id: issue.id,
        subscriptionId: issue.subscriptionId,
        planName: issue.planName,
        mealName: issue.mealName,
      }))
    ).toEqual([
      {
        id: 'iss-1',
        subscriptionId: 'sub-1',
        planName: 'Month Plan',
        mealName: 'Lamb Kabsa',
      },
      {
        id: 'iss-2',
        subscriptionId: 'sub-2',
        planName: 'Week Plan',
        mealName: 'Chicken Biryani',
      },
      {
        id: 'iss-orphan',
        subscriptionId: 'sub-missing',
        planName: null,
        mealName: null,
      },
    ])
    expect(deliveries).toEqual([
      {
        id: 'dd-1',
        date: '2026-05-05',
        status: 'delivered',
        mealType: 'executive',
        mealName: 'Ignored Snapshot',
      },
    ])
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dd.user_id = :userId'),
      expect.objectContaining({
        replacements: { userId: USER_ID },
        type: QueryTypes.SELECT,
      })
    )
  })
})
