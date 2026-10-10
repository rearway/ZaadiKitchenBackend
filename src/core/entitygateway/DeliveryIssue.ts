import { DeliveryIssue, IssueStatus } from '../entities/DeliveryIssue.js'

export interface DeliveryIssuePersistor {
  createIssue(
    input: Omit<DeliveryIssue, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<DeliveryIssue>
  resolveIssue(
    id: string,
    resolution: 'credited' | 'rejected',
    details: {
      creditedAmountSar?: number
      rejectionReason?: string
      rejectionNotes?: string
    }
  ): Promise<DeliveryIssue>
}

export interface DeliveryIssueLoader {
  getIssuesBySubscription(subscriptionId: string): Promise<DeliveryIssue[]>
  getIssueById(id: string): Promise<DeliveryIssue | null>
  getOpenIssuesByDate(
    date?: string,
    status?: IssueStatus | 'all'
  ): Promise<DailyOpsIssueRow[]>
}

export interface DailyOpsIssueRow {
  issueId: string
  customerId: string
  customerName: string
  customerPhone: string | null
  deliveryAddress: string | null
  issueType: string
  description: string | null
  submittedAt: Date
  deliveryDate: string
  mealName: string | null
  mealType: string | null
  planPricePerMealSar: number | null
  status: IssueStatus
  creditedAmountSar: number | null
  rejectionReason: string | null
  rejectionNotes: string | null
  resolvedAt: Date | null
}
