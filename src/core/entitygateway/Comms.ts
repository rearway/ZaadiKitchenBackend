import type { AutomationId, BroadcastSegmentId } from '../usecases/services/commsUtils.js'

export interface CommsAutomationState {
  id: AutomationId
  isEnabled: boolean
  updatedAt: Date | null
  updatedByUserId: string | null
}

export interface CommsBroadcastRecord {
  id: string
  segmentId: BroadcastSegmentId
  message: string
  recipientCount: number
  sentByUserId: string
  status: 'sent'
  sentAt: Date
}

export interface CommsLoader {
  getAutomationStates(): Promise<CommsAutomationState[]>
  isAutomationEnabled(id: AutomationId): Promise<boolean>
  getBroadcastSegmentCounts(todayKsa: string): Promise<Record<BroadcastSegmentId, number>>
  getSegmentRecipientUserIds(
    segmentId: BroadcastSegmentId,
    todayKsa: string
  ): Promise<string[]>
  getActiveDeviceEndpointsForUsers(userIds: string[]): Promise<string[]>
}

export interface CommsPersistor {
  setAutomationEnabled(
    id: AutomationId,
    isEnabled: boolean,
    updatedByUserId: string
  ): Promise<CommsAutomationState>
  createBroadcastRecord(input: {
    segmentId: BroadcastSegmentId
    message: string
    recipientCount: number
    sentByUserId: string
  }): Promise<CommsBroadcastRecord>
}
