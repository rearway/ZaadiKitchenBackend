export interface DailyOpsDay {
  date: string
  dispatchedAt: Date | null
  dispatchedById: string | null
  deliveredAt: Date | null
  deliveredById: string | null
  createdAt: Date
  updatedAt: Date
}
