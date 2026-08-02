import type { RiderIssue } from '../entities/RiderIssue.js'

export interface RiderIssuePersistor {
  createRiderIssue(
    input: Omit<RiderIssue, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RiderIssue>
}
