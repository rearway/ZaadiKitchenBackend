import {
  buildTwilioWhatsAppOtpCreateParams,
  buildWhatsAppOtpContentVariables,
  formatWhatsAppAddress,
  formatWhatsAppFrom,
} from '../twilioWhatsAppPayload.js'

describe('twilioWhatsAppPayload', () => {
  it('builds ContentVariables as JSON string with key "1" only', () => {
    expect(buildWhatsAppOtpContentVariables('4829')).toBe('{"1":"4829"}')
  })

  it('rejects non-four-digit codes', () => {
    expect(() => buildWhatsAppOtpContentVariables('123')).toThrow(/4 digits/)
    expect(() => buildWhatsAppOtpContentVariables('12345')).toThrow(/4 digits/)
    expect(() => buildWhatsAppOtpContentVariables('12ab')).toThrow(/4 digits/)
  })

  it('formats whatsapp To/From without double prefix', () => {
    expect(formatWhatsAppAddress('+966500191761')).toBe('whatsapp:+966500191761')
    expect(formatWhatsAppFrom('whatsapp:+966569378110')).toBe('whatsapp:+966569378110')
    expect(formatWhatsAppFrom('+966569378110')).toBe('whatsapp:+966569378110')
  })

  it('template create params include only from, to, contentSid, contentVariables, optional statusCallback', () => {
    const params = buildTwilioWhatsAppOtpCreateParams({
      from: 'whatsapp:+966569378110',
      phoneE164: '+918113871897',
      code: '1234',
      contentSid: 'HX99aaa5e069f06160563aecfb9ae592a8',
      statusCallbackUrl: 'https://api.example.com/api/v1/auth/webhooks/twilio/otp-status',
    })

    expect(params).toEqual({
      from: 'whatsapp:+966569378110',
      to: 'whatsapp:+918113871897',
      contentSid: 'HX99aaa5e069f06160563aecfb9ae592a8',
      contentVariables: '{"1":"1234"}',
      statusCallback:
        'https://api.example.com/api/v1/auth/webhooks/twilio/otp-status',
    })
    expect(Object.keys(params).sort()).toEqual([
      'contentSid',
      'contentVariables',
      'from',
      'statusCallback',
      'to',
    ])
  })
})