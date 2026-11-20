import { Deps } from '../../entitygateway/index.js'
import { AuthenticationError } from '../../../shared/errors/index.js'
import {
  maskOtpInText,
  maskPhoneForLog,
  parseWhatsAppE164FromTwilioAddress,
  pickTwilioStatusCallbackFields,
  shouldTriggerWhatsAppOtpSmsFallback,
  validateTwilioRequestSignature,
} from '../../../shared/otp/twilioWebhookUtils.js'
import { getTwilioStatusCallbackValidationUrl } from '../../../shared/otp/twilioOtpConfig.js'

export interface HandleTwilioStatusCallbackInput {
  signature: string | undefined
  body: Record<string, string>
}

export type HandleTwilioStatusCallbackOutput = {
  ok: true
}

export function makeUC(deps: Deps) {
  return async function handleTwilioStatusCallback(
    input: HandleTwilioStatusCallbackInput
  ): Promise<HandleTwilioStatusCallbackOutput> {
    const { logger, otpSessionLoader, otpService, twilioAuthToken } = deps

    if (!getTwilioStatusCallbackValidationUrl()) {
      throw new AuthenticationError(
        'Twilio status callback URL is not configured (TWILIO_STATUS_CALLBACK_URL)'
      )
    }

    if (!twilioAuthToken) {
      throw new AuthenticationError('Twilio auth token is not configured')
    }

    if (!validateTwilioRequestSignature(twilioAuthToken, input.signature, input.body)) {
      throw new AuthenticationError('Invalid Twilio webhook signature')
    }

    const fields = pickTwilioStatusCallbackFields(input.body)
    const recipient =
      parseWhatsAppE164FromTwilioAddress(fields.ChannelToAddress) ??
      parseWhatsAppE164FromTwilioAddress(fields.To)

    logger.log(
      'Twilio OTP status callback',
      JSON.stringify({
        MessageSid: fields.MessageSid,
        MessageStatus: fields.MessageStatus,
        ErrorCode: fields.ErrorCode,
        ErrorMessage: maskOtpInText(fields.ErrorMessage),
        ChannelStatusMessage: maskOtpInText(fields.ChannelStatusMessage),
        ChannelStatusCode: fields.ChannelStatusCode,
        ChannelToAddress: maskPhoneForLog(fields.ChannelToAddress),
        To: maskPhoneForLog(fields.To),
        From: maskPhoneForLog(fields.From),
      })
    )

    if (
      recipient &&
      shouldTriggerWhatsAppOtpSmsFallback({
        messageStatus: fields.MessageStatus,
        errorCode: fields.ErrorCode,
      }) &&
      otpService.sendSmsFallbackIfEnabled
    ) {
      const session = await otpSessionLoader.getActiveSession(recipient)
      if (session?.channel === 'whatsapp' && session.code) {
        const dedupeKey = fields.MessageSid
          ? `callback:${fields.MessageSid}`
          : `callback:${recipient}:${session.id}`
        await otpService.sendSmsFallbackIfEnabled(
          recipient,
          session.code,
          dedupeKey
        )
      }
    }

    return { ok: true }
  }
}

export const name = 'HandleTwilioStatusCallback'