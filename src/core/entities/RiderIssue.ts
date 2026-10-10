export type RiderIssueType = 'customer_not_found' | 'wrong_address' | 'access_denied' | 'other'

export interface RiderIssue {
  id: string
  deliveryDayId: string
  riderId: string
  issueType: RiderIssueType
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
