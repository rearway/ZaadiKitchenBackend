export const KSA_TIMEZONE = 'Asia/Riyadh'

export const BROADCAST_TITLE = 'Zaadi Kitchen'

export const BROADCAST_SEGMENT_IDS = [
  'all_subscribers',
  'active',
  'paused',
  'delivering_today',
] as const

export type BroadcastSegmentId = (typeof BROADCAST_SEGMENT_IDS)[number]

export const BROADCAST_SEGMENT_LABELS: Record<BroadcastSegmentId, string> = {
  all_subscribers: 'All subscribers',
  active: 'Active',
  paused: 'Paused',
  delivering_today: 'Delivering Today',
}

export const AUTOMATION_IDS = [
  'delivery_confirmed',
  'eod_feedback',
  'renewal_reminder',
  'referral_reward',
  'lapsed_reactivation',
] as const

export type AutomationId = (typeof AUTOMATION_IDS)[number]

export interface AutomationDefinition {
  id: AutomationId
  name: string
  description: string
  icon: string
  defaultEnabled: boolean
}

export const AUTOMATION_DEFINITIONS: AutomationDefinition[] = [
  {
    id: 'delivery_confirmed',
    name: 'Delivery Confirmed',
    description: 'Trigger: Driver taps Mark as Delivered',
    icon: '✅',
    defaultEnabled: true,
  },
  {
    id: 'eod_feedback',
    name: 'End-of-Day Feedback',
    description: 'Trigger: 3:00 PM daily to meal recipients',
    icon: '⭐',
    defaultEnabled: true,
  },
  {
    id: 'renewal_reminder',
    name: 'Renewal Reminder',
    description: 'Trigger: 48 hrs before plan end date',
    icon: '🔄',
    defaultEnabled: true,
  },
  {
    id: 'referral_reward',
    name: 'Referral Reward',
    description: "Trigger: Referred friend's plan activates",
    icon: '🎁',
    defaultEnabled: true,
  },
  {
    id: 'lapsed_reactivation',
    name: 'Lapsed Reactivation',
    description: 'Trigger: Expired + no renewal after 3 days',
    icon: '😴',
    defaultEnabled: false,
  },
]

export function todayKSA(referenceDate: Date = new Date()): string {
  const ksa = new Date(referenceDate.toLocaleString('en-US', { timeZone: KSA_TIMEZONE }))
  const y = ksa.getFullYear()
  const m = String(ksa.getMonth() + 1).padStart(2, '0')
  const d = String(ksa.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidAutomationId(id: string): id is AutomationId {
  return (AUTOMATION_IDS as readonly string[]).includes(id)
}

export function isValidSegmentId(id: string): id is BroadcastSegmentId {
  return (BROADCAST_SEGMENT_IDS as readonly string[]).includes(id)
}
