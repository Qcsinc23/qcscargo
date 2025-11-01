export interface WhatsAppConfig {
  accountSid?: string
  authToken?: string
  fromNumber?: string
}

export interface WhatsAppMessagePayload {
  to: string
  body: string
  mediaUrl?: string
}

export interface WhatsAppSendResult {
  success: boolean
  sid?: string
  error?: string
}

function ensureWhatsAppPrefix(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed}`
}

export function formatWhatsAppNumber(
  phone: string | null | undefined,
  countryCode?: string | null
): string | null {
  if (!phone) return null

  const normalizedDigits = phone.replace(/\D+/g, '')
  if (!normalizedDigits) return null

  const hasExplicitPlus = phone.trim().startsWith('+')
  const normalizedCountry = countryCode ? countryCode.replace(/\D+/g, '') : ''

  let fullNumber = ''

  if (hasExplicitPlus) {
    fullNumber = `+${normalizedDigits}`
  } else if (normalizedCountry) {
    const alreadyPrefixed = normalizedDigits.startsWith(normalizedCountry)
    fullNumber = `+${alreadyPrefixed ? normalizedDigits : `${normalizedCountry}${normalizedDigits}`}`
  } else {
    // Without a country code, we cannot reliably send the message
    return null
  }

  return ensureWhatsAppPrefix(fullNumber)
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  payload: WhatsAppMessagePayload
): Promise<WhatsAppSendResult> {
  const { accountSid, authToken, fromNumber } = config

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: 'Twilio WhatsApp configuration is incomplete'
    }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const params = new URLSearchParams()
    params.append('To', ensureWhatsAppPrefix(payload.to))
    params.append('From', ensureWhatsAppPrefix(fromNumber))
    params.append('Body', payload.body)
    if (payload.mediaUrl) {
      params.append('MediaUrl', payload.mediaUrl)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Twilio API error: ${errorText}`)
    }

    const data = await response.json()
    return {
      success: true,
      sid: data.sid
    }
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
