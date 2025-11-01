import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  formatWhatsAppNumber,
  sendWhatsAppMessage,
  type WhatsAppConfig,
} from '../whatsapp-utils'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('formatWhatsAppNumber', () => {
  it('preserves explicit plus prefix and ensures whatsapp scheme', () => {
    expect(formatWhatsAppNumber('+15551234567')).toBe('whatsapp:+15551234567')
  })

  it('adds country code when provided without plus', () => {
    expect(formatWhatsAppNumber('5551234567', '1')).toBe('whatsapp:+15551234567')
  })

  it('returns null when country code missing and number lacks plus', () => {
    expect(formatWhatsAppNumber('5551234567')).toBeNull()
  })
})

describe('sendWhatsAppMessage', () => {
  const baseConfig: WhatsAppConfig = {
    accountSid: 'AC123',
    authToken: 'secret',
    fromNumber: '+15550001111',
  }

  it('returns configuration error when credentials missing', async () => {
    const result = await sendWhatsAppMessage({}, {
      to: '+15551234567',
      body: 'Hello',
    })

    expect(result).toEqual({
      success: false,
      error: 'Twilio WhatsApp configuration is incomplete',
    })
  })

  it('sends message payload to Twilio API and returns sid on success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sid: 'SM123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response
    )

    const result = await sendWhatsAppMessage(baseConfig, {
      to: '+15551234567',
      body: 'Hello from tests',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Basic '),
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )

    const [, options] = fetchMock.mock.calls[0]
    const body = options && 'body' in options ? (options.body as string) : ''
    expect(body).toContain('To=whatsapp%3A%2B15551234567')
    expect(body).toContain('From=whatsapp%3A%2B15550001111')
    expect(body).toContain('Body=Hello+from+tests')

    expect(result).toEqual({
      success: true,
      sid: 'SM123',
    })
  })

  it('captures Twilio API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }) as Response
    )

    const result = await sendWhatsAppMessage(baseConfig, {
      to: '+15551234567',
      body: 'Hello',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Twilio API error')
  })
})
