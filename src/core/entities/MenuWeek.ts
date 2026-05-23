export interface MenuWeek {
  id: string        // e.g. 'w2025-19'
  weekNumber: number
  year: number
  dateFrom: string  // YYYY-MM-DD (Sunday)
  dateTo: string    // YYYY-MM-DD (Thursday)
  status: 'draft' | 'published' | 'past'
  publishedAt?: Date
  publishedBy?: string
  createdAt: Date
  updatedAt: Date
}
