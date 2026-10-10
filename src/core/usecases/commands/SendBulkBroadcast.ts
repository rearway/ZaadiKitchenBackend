import { Deps } from '../../entitygateway/index.js'

export interface SendBulkBroadcastInput {
  title: string
  body: string
}

export type SendBulkBroadcastOutput = {
  message: string
}

export function makeUC(deps: Deps) {
  return async function sendBulkBroadcast(
    input: SendBulkBroadcastInput
  ): Promise<SendBulkBroadcastOutput> {
    const { logger, notificationGateway } = deps

    try {
      // Publish to the 'broadcast' topic. The gateway resolves 'broadcast' to the actual ARN.
      await notificationGateway.publishToTopic(
        'broadcast',
        input.title,
        input.body
      )

      return {
        message: 'Broadcast sent successfully',
      }
    } catch (error) {
      logger.error(
        'Failed to send bulk broadcast',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SendBulkBroadcast'
