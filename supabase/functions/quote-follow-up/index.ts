import {
  COMPANY_CONTACT,
  DEFAULT_TERMS,
  QuoteDocumentPayload,
  generateQuoteHtml,
  generateQuotePdf,
  formatCurrency
} from "../_shared/quote-utils.ts"
import { generateNotificationText } from "../_shared/email-utils.ts"
import { formatWhatsAppNumber, sendWhatsAppMessage } from "../_shared/whatsapp-utils.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, PATCH",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "false"
}

const fetchQuoteRecords = async (supabaseUrl: string, serviceRoleKey: string, query: string) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/shipping_quotes${query}`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to load quotes: ${errorText}`)
  }

  return await response.json()
}

const toBase64 = (bytes: Uint8Array) => {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const buildFollowUpEmail = async (quote: any, resendApiKey: string | undefined) => {
  if (!resendApiKey) {
    throw new Error("Resend API key not configured")
  }

  const weightMeta = quote.quote_metadata?.weight || {}
  const fallbackWeight = coerceNumber(quote.weight_lbs) ?? 0
  const dimensionalWeight = coerceNumber(weightMeta.dimensional)
  const actualWeight = coerceNumber(weightMeta.actual) ?? fallbackWeight
  const billableWeight =
    coerceNumber(weightMeta.billable) ?? Math.max(actualWeight, dimensionalWeight ?? actualWeight)

  const declaredValue = coerceNumber(quote.declared_value) ?? 0

  const rateMeta = quote.quote_metadata?.rate_breakdown || {}
  const baseShippingCost = coerceNumber(rateMeta.baseShippingCost) ?? coerceNumber(quote.base_shipping_cost) ?? 0
  const consolidationFee = coerceNumber(rateMeta.consolidationFee) ?? coerceNumber(quote.consolidation_fee) ?? 0
  const handlingFee = coerceNumber(rateMeta.handlingFee) ?? coerceNumber(quote.handling_fee) ?? 0
  const insuranceCost = coerceNumber(rateMeta.insuranceCost) ?? coerceNumber(quote.insurance_cost) ?? 0
  const totalCost = coerceNumber(rateMeta.totalCost) ?? coerceNumber(quote.total_cost) ?? 0
  const expressSurcharge = coerceNumber(rateMeta.expressSurcharge) ?? 0

  const payload: QuoteDocumentPayload = {
    quoteReference: quote.quote_reference,
    customerName: quote.full_name,
    customerEmail: quote.email,
    customerPhone: quote.phone,
    createdAt: quote.created_at,
    expiresAt: quote.quote_expires_at,
    origin: {
      name: COMPANY_CONTACT.name,
      address: COMPANY_CONTACT.address,
      phone: COMPANY_CONTACT.phone,
      email: COMPANY_CONTACT.email
    },
    destination: {
      country: quote.quote_metadata?.destination?.country || quote.destination_country || "",
      city: quote.quote_metadata?.destination?.city || quote.destination_city || null,
      airportCode: quote.quote_metadata?.destination?.airport_code || quote.destination_airport || null
    },
    packageDetails: {
      actualWeightLbs: actualWeight,
      billableWeightLbs: billableWeight,
      dimensionalWeightLbs: dimensionalWeight,
      dimensions: {
        length: coerceNumber(quote.length_inches),
        width: coerceNumber(quote.width_inches),
        height: coerceNumber(quote.height_inches)
      },
      declaredValue,
      serviceType: quote.service_type
    },
    rateBreakdown: {
      baseShippingCost,
      consolidationFee,
      handlingFee,
      insuranceCost,
      totalCost,
      expressSurcharge
    },
    transitEstimate: quote.quote_metadata?.transit_estimate || {
      min: quote.estimated_transit_days,
      label: quote.quote_metadata?.transit_label || null
    },
    notes: quote.special_instructions,
    terms: quote.quote_metadata?.terms || DEFAULT_TERMS,
    callToActionUrl: quote.quote_metadata?.call_to_action || `${COMPANY_CONTACT.website}/booking`
  }

  const html = generateQuoteHtml({ ...payload, callToActionUrl: payload.callToActionUrl })
  let pdfBase64: string | null = null

  try {
    const pdfBytes = await generateQuotePdf(payload)
    pdfBase64 = toBase64(new Uint8Array(pdfBytes))
  } catch (error) {
    console.error("Failed to regenerate follow-up PDF:", error)
  }

  const followUpHtml = html
    .replace("Confirm Booking with QCS Cargo", "Book Your Shipment with QCS Cargo")
    .replace(
      "Quote request saved and emailed successfully.",
      "We're holding these rates for you for a limited time."
    )

  const sanitizedQuoteHtml = followUpHtml
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/<html[^>]*>/i, "")
    .replace(/<body[^>]*>/i, "")
    .replace(/<\/body>/i, "")
    .replace(/<\/html>/i, "")

  const expirationLabel = new Date(quote.quote_expires_at).toLocaleDateString("en-US", {
    dateStyle: "medium"
  })

  const followUpNotification = {
    title: `Reminder: Quote ${quote.quote_reference} Expires Soon`,
    message: `Hi ${quote.full_name.split(" ")[0]}, we're holding your QCS Cargo quote ${quote.quote_reference} until ${expirationLabel}.`,
    actionText: "Confirm Shipment",
    actionUrl: payload.callToActionUrl,
    details: [
      { label: "Total Cost", value: formatCurrency(totalCost) },
      {
        label: "Service Level",
        value: quote.service_type === "express" ? "Express Priority" : "Standard Air Freight"
      },
      {
        label: "Transit",
        value: payload.transitEstimate?.label || `${payload.transitEstimate?.min ?? ""} business days`
      }
    ],
    footerNote: "Reply to this message if you need adjustments or are ready to proceed."
  }

  const notificationText = generateNotificationText(followUpNotification)

  return {
    html:
      `<!DOCTYPE html><html><body>` +
      `<div style="font-family:Inter,Helvetica,Arial,sans-serif;background:#f8fafc;padding:24px;">` +
      `<div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">` +
      `<p style="font-size:16px;color:#1f2937;">Hi ${quote.full_name.split(" ")[0]},</p>` +
      `<p style="font-size:15px;color:#334155;line-height:1.6;">This is a friendly reminder that your QCS Cargo quote <strong>${quote.quote_reference}</strong> is set to expire on <strong>${new Date(quote.quote_expires_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</strong>. We still have capacity available and can secure these rates if you confirm soon.</p>` +
      `<p style="font-size:15px;color:#334155;line-height:1.6;">Here are the highlights:</p>` +
      `<ul style="color:#475569;font-size:14px;line-height:1.6;">` +
      `<li>Total Investment: <strong>${quote.quote_document_html?.match(/Total Investment<\/td>\s*<td>(.*?)<\/td>/)?.[1] || "Provided upon request"}</strong></li>` +
      `<li>Service Level: <strong>${quote.service_type === "express" ? "Express Priority" : "Standard Air Freight"}</strong></li>` +
      `<li>Destination: <strong>${payload.destination.city ? `${payload.destination.city}, ` : ""}${payload.destination.country}</strong></li>` +
      `<li>Estimated Transit: <strong>${payload.transitEstimate?.label || `${payload.transitEstimate?.min || ""} business days`}</strong></li>` +
      `</ul>` +
      `<p style="font-size:15px;color:#334155;line-height:1.6;">If you would like to proceed, simply reply to this email or call us at <strong>${COMPANY_CONTACT.phone}</strong>. We can finalize paperwork and schedule pickup right away.</p>` +
      `<div style="text-align:center;margin:28px 0;">` +
      `<a href="${payload.callToActionUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#9333ea,#6366f1);color:#ffffff;padding:14px 28px;border-radius:999px;font-weight:600;text-decoration:none;">Confirm My Shipment</a>` +
      `</div>` +
      `<p style="font-size:13px;color:#64748b;line-height:1.6;">If you've already made alternative arrangements, please let us know so we can close out this quote.</p>` +
      `<p style="font-size:12px;color:#94a3b8;margin-top:24px;">${COMPANY_CONTACT.name} • ${COMPANY_CONTACT.address} • ${COMPANY_CONTACT.phone}</p>` +
      `<p style="font-size:12px;color:#94a3b8;">${COMPANY_CONTACT.email} • ${COMPANY_CONTACT.website}</p>` +
      `</div>` +
      `<div style="margin-top:32px;border-top:1px solid #e2e8f0;padding-top:24px;">${sanitizedQuoteHtml}</div>` +
      `</div></body></html>`,
    pdfBase64,
    notificationText,
    notificationContent: followUpNotification
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const payload = req.method === "POST" && req.headers.get("Content-Length") !== "0" ? await req.json() : {}
    const { quoteId, autoProcess = false } = payload

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    const whatsappConfig = {
      accountSid: Deno.env.get("TWILIO_ACCOUNT_SID"),
      authToken: Deno.env.get("TWILIO_AUTH_TOKEN"),
      fromNumber: Deno.env.get("TWILIO_WHATSAPP_FROM")
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing")
    }

    const now = new Date().toISOString()
    let quotes: any[] = []

    if (quoteId) {
      const records = await fetchQuoteRecords(supabaseUrl, serviceRoleKey, `?id=eq.${quoteId}`)
      if (!records.length) {
        throw new Error("Quote not found")
      }
      quotes = records
    } else {
      const query = `?or=(follow_up_status.eq.scheduled,follow_up_status.eq.pending)&follow_up_due_at=lte.${now}&status=neq.closed&select=*`
      quotes = await fetchQuoteRecords(supabaseUrl, serviceRoleKey, query)
      if (!quotes.length) {
        return new Response(
          JSON.stringify({ data: { processed: 0, message: "No quotes require follow-up." } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    const results: any[] = []
    for (const quote of quotes) {
      try {
        const emailContent = await buildFollowUpEmail(quote, resendApiKey)

        const emailPayload: Record<string, unknown> = {
          from: `${COMPANY_CONTACT.name} <${COMPANY_CONTACT.email}>`,
          to: [quote.email],
          subject: `Follow-Up: Quote ${quote.quote_reference} Expires Soon`,
          html: emailContent.html,
          reply_to: COMPANY_CONTACT.email,
          tags: [
            { name: "quote_reference", value: quote.quote_reference },
            { name: "follow_up", value: autoProcess ? "automated" : "manual" }
          ]
        }

        if (emailContent.pdfBase64) {
          emailPayload["attachments"] = [
            {
              filename: `${quote.quote_reference}.pdf`,
              content: emailContent.pdfBase64,
              contentType: "application/pdf"
            }
          ]
        }

        if (!resendApiKey) {
          throw new Error("Resend API key not configured")
        }

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(emailPayload)
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          throw new Error(`Resend API error: ${errorText}`)
        }

        const whatsappRecipient = formatWhatsAppNumber(
          quote.phone || quote.quote_metadata?.customer?.phone || null,
          quote.phone_country_code || quote.quote_metadata?.customer?.phone_country_code || null
        )

        const hasWhatsAppConfig =
          whatsappConfig.accountSid &&
          whatsappConfig.authToken &&
          whatsappConfig.fromNumber

        if (whatsappRecipient && emailContent.notificationText && hasWhatsAppConfig) {
          const whatsappResult = await sendWhatsAppMessage(whatsappConfig, {
            to: whatsappRecipient,
            body: emailContent.notificationText
          })

          if (!whatsappResult.success) {
            console.warn('Failed to send WhatsApp follow-up notification:', whatsappResult.error)
          }
        } else if (whatsappRecipient && !hasWhatsAppConfig) {
          console.warn('WhatsApp configuration missing - skipping quote follow-up message')
        }

        const updatePayload = {
          follow_up_status: "completed",
          last_follow_up_at: new Date().toISOString(),
          follow_up_method: autoProcess ? "automated" : "manual"
        }

        await fetch(`${supabaseUrl}/rest/v1/shipping_quotes?id=eq.${quote.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify(updatePayload)
        })

        results.push({ quoteId: quote.id, status: "sent" })
      } catch (error) {
        console.error(`Failed to process follow-up for quote ${quote.id}:`, error)
        await fetch(`${supabaseUrl}/rest/v1/shipping_quotes?id=eq.${quote.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            follow_up_status: "failed",
            follow_up_error: error instanceof Error ? error.message : String(error)
          })
        })
        results.push({
          quoteId: quote.id,
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return new Response(
      JSON.stringify({ data: { processed: results.length, results } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Quote follow-up error:", error)
    return new Response(
      JSON.stringify({
        error: {
          code: "QUOTE_FOLLOW_UP_FAILED",
          message: error instanceof Error ? error.message : "Unable to process follow-up"
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})
