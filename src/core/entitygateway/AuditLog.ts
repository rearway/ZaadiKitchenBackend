import type { AuditLog, AuditLogAction } from '../entities/AuditLog.js'

export interface CreateAuditLogInput {
  userId: string
  subscriptionId: string | null
  action: AuditLogAction
  metadata?: Record<string, unknown>
}

export interface AuditLogPersistor {
  createAuditLog(input: CreateAuditLogInput): Promise<AuditLog>
}

export interface AuditLogLoader {
  getAuditLogsBySubscription(subscriptionId: string): Promise<AuditLog[]>
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>
}
