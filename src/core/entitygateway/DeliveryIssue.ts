import { DeliveryIssue } from '../entities/DeliveryIssue.js'

export interface DeliveryIssuePersistor {
  createIssue(
    input: Omit<DeliveryIssue, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<DeliveryIssue>
}

export interface DeliveryIssueLoader {
  getIssuesBySubscription(subscriptionId: string): Promise<DeliveryIssue[]>
  getIssueById(id: string): Promise<DeliveryIssue | null>
}
