export type IssueType = 'wrong_order' | 'quality_issue' | 'not_delivered' | 'damaged'
export type IssueStatus = 'open' | 'credited' | 'rejected'

export interface DeliveryIssue {
  id: string
  userId: string
  subscriptionId: string
  deliveryDate: string
  issueType: IssueType
  description?: string
  status: IssueStatus
  creditedAmountSar?: number
  rejectionReason?: string
  rejectionNotes?: string
  createdAt: Date
  updatedAt: Date
}
