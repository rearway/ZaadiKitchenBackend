export type AuditLogAction =
  | 'skip_delivery'
  | 'undo_skip_delivery'
  | 'pause_subscription'
  | 'resume_subscription'
  | 'cancel_subscription'
  | 'expire_subscription'

export interface AuditLog {
  id: string
  userId: string
  subscriptionId: string | null
  action: AuditLogAction
  metadata: Record<string, unknown> | null
  createdAt: Date
}
