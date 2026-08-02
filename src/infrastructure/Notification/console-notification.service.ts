import { Injectable } from '@nestjs/common'
import type { NotificationGateway } from '../../core/entitygateway/Notification.js'

/**
 * Stands in for a real push provider (FCM, APNs, etc.). No provider is
 * wired up yet — this just logs so the calling business logic (issue
 * resolution, pipeline advance, broadcasts) can be built and tested now.
 * Replace with a real NotificationService by swapping the binding in
 * coreadapter.module.ts — no other code changes needed.
 */
@Injectable()
export class ConsoleNotificationService implements NotificationGateway {
  async notify(userId: string, message: string): Promise<void> {
    console.log(`[notification stub] to user ${userId}: ${message}`)
  }
}
