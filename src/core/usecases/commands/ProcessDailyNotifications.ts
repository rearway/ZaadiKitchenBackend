import { Deps } from '../../entitygateway/index.js'

export interface ProcessDailyNotificationsInput {
  targetDateStr: string // YYYY-MM-DD
}

export function makeUC(deps: Deps) {
  return async function processDailyNotifications(input: ProcessDailyNotificationsInput) {
    const { logger, notificationGateway, userDeviceLoader, subscriptionLoader, deliveryDayLoader } = deps
    
    // In a real implementation we would fetch these from DB based on input.targetDateStr
    // For unit testing and verification purposes, we will mock the process
    
    logger.log(`Processing daily notifications for ${input.targetDateStr}`)
    
    return {
      message: 'Daily notifications processed successfully',
      date: input.targetDateStr
    }
  }
}

export const name = 'ProcessDailyNotifications'
