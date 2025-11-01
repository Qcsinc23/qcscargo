import {
  COMPANY_CONTACT,
  DEFAULT_TERMS,
  QuoteDocumentPayload,
  generateQuoteHtml,
  generateQuotePdf,
  generateQuoteReference
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const {
      customerInfo,
      destinationId,
      weight,
      dimensions,
      serviceType = "standard",
      declaredValue = 0,
      rateBreakdown,
      specialInstructions
    } = await req.json()

    if (!customerInfo || !customerInfo.email || !customerInfo.fullName) {
      throw new Error("Customer name and email are required")
    }

    if (!destinationId || !weight) {
      throw new Error("Destination and weight are required")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const resendApiKey = Deno.env.get("RESEND_API_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing")
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

    const roundToTwo = (value: number) => parseFloat(value.toFixed(2))

    let customerId: string | null = null
    const authHeader = req.headers.get("authorization")
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "")
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: serviceRoleKey
          }
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          customerId = userData.id
        }
      } catch (error) {
        console.log("Could not get user from token:", error.message)
      }
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const followUpDueAt = new Date()
    followUpDueAt.setDate(followUpDueAt.getDate() + 3)

    const destinationResponse = await fetch(
      `${supabaseUrl}/rest/v1/destinations?id=eq.${destinationId}&select=country_name,city_name,airport_code,transit_days_min,transit_days_max,rate_per_lb_1_50,rate_per_lb_51_100,rate_per_lb_101_200,rate_per_lb_201_plus,express_surcharge_percent`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey
        }
      }
    )

    if (!destinationResponse.ok) {
      throw new Error("Unable to load destination details")
    }

    const destinationData = await destinationResponse.json()
    if (!destinationData || destinationData.length === 0) {
      throw new Error("Destination not found")
    }

    const destination = destinationData[0]
    const weightValue = coerceNumber(weight)
    if (!weightValue || weightValue <= 0) {
      throw new Error("Valid shipment weight is required")
    }

    const declaredValueNumber = Math.max(0, coerceNumber(declaredValue) ?? 0)

    const normalizedDimensions = {
      length: coerceNumber(dimensions?.length),
      width: coerceNumber(dimensions?.width),
      height: coerceNumber(dimensions?.height)
    }

    const hasDimensions =
      typeof normalizedDimensions.length === "number" &&
      typeof normalizedDimensions.width === "number" &&
      typeof normalizedDimensions.height === "number"

    let dimensionalWeight: number | null = null
    let billableWeight = weightValue
    if (hasDimensions) {
      dimensionalWeight =
        ((normalizedDimensions.length as number) *
          (normalizedDimensions.width as number) *
          (normalizedDimensions.height as number)) /
        166
      billableWeight = Math.max(weightValue, dimensionalWeight)
    }

    const rateTier1 = coerceNumber(destination.rate_per_lb_1_50) ?? 0
    const rateTier2 = coerceNumber(destination.rate_per_lb_51_100) ?? rateTier1
    const rateTier3 = coerceNumber(destination.rate_per_lb_101_200) ?? rateTier2
    const rateTier4 = coerceNumber(destination.rate_per_lb_201_plus) ?? rateTier3

    let ratePerLb = rateTier4
    if (billableWeight <= 50) {
      ratePerLb = rateTier1
    } else if (billableWeight <= 100) {
      ratePerLb = rateTier2
    } else if (billableWeight <= 200) {
      ratePerLb = rateTier3
    }

    let baseShippingCostRaw = billableWeight * ratePerLb
    let expressSurchargeRaw = 0
    const expressPercent = coerceNumber(destination.express_surcharge_percent) ?? 0
    if (serviceType === "express") {
      expressSurchargeRaw = baseShippingCostRaw * (expressPercent / 100)
      baseShippingCostRaw += expressSurchargeRaw
    }

    const handlingFeeRaw = billableWeight > 70 ? 20 : 0
    const consolidationFeeInput = coerceNumber(rateBreakdown?.consolidationFee)
    const consolidationFee =
      consolidationFeeInput && consolidationFeeInput > 0 ? roundToTwo(consolidationFeeInput) : 0
    const insuranceCostRaw =
      declaredValueNumber > 100 ? Math.max(15, ((declaredValueNumber - 100) / 100) * 7.5) : 0

    const totalCostRaw = baseShippingCostRaw + consolidationFee + handlingFeeRaw + insuranceCostRaw

    const computedRateBreakdown = {
      ratePerLb: roundToTwo(ratePerLb),
      baseShippingCost: roundToTwo(baseShippingCostRaw),
      expressSurcharge: roundToTwo(expressSurchargeRaw),
      consolidationFee,
      handlingFee: roundToTwo(handlingFeeRaw),
      insuranceCost: roundToTwo(insuranceCostRaw),
      totalCost: roundToTwo(totalCostRaw)
    }

    const clientRateSnapshot = rateBreakdown
      ? {
          baseShippingCost: coerceNumber(rateBreakdown.baseShippingCost),
          expressSurcharge: coerceNumber(rateBreakdown.expressSurcharge),
          consolidationFee: coerceNumber(rateBreakdown.consolidationFee),
          handlingFee: coerceNumber(rateBreakdown.handlingFee),
          insuranceCost: coerceNumber(rateBreakdown.insuranceCost),
          totalCost: coerceNumber(rateBreakdown.totalCost)
        }
      : null

    const normalizedClientSnapshot = clientRateSnapshot
      ? (Object.fromEntries(
          Object.entries(clientRateSnapshot).map(([key, value]) => [key, value !== null ? roundToTwo(value) : null])
        ) as Record<string, number | null>)
      : null

    const discrepancy =
      normalizedClientSnapshot && normalizedClientSnapshot.totalCost !== null
        ? {
            totalCostDelta: roundToTwo(
              normalizedClientSnapshot.totalCost - computedRateBreakdown.totalCost
            ),
            baseShippingCostDelta:
              normalizedClientSnapshot.baseShippingCost !== null
                ? roundToTwo(
                    normalizedClientSnapshot.baseShippingCost -
                      computedRateBreakdown.baseShippingCost
                  )
                : null,
            expressSurchargeDelta:
              normalizedClientSnapshot.expressSurcharge !== null
                ? roundToTwo(
                    normalizedClientSnapshot.expressSurcharge -
                      computedRateBreakdown.expressSurcharge
                  )
                : null
          }
        : null

    // Zero-tolerance policy: reject ANY discrepancy in rate calculations
    const tamperingDetected =
      discrepancy &&
      ((discrepancy.totalCostDelta !== null && Math.abs(discrepancy.totalCostDelta) > 0) ||
        (discrepancy.baseShippingCostDelta !== null && Math.abs(discrepancy.baseShippingCostDelta) > 0) ||
        (discrepancy.expressSurchargeDelta !== null && Math.abs(discrepancy.expressSurchargeDelta) > 0))

    // If tampering is detected, reject the quote immediately
    if (tamperingDetected) {
      console.error('Quote rejected due to rate tampering:', {
        discrepancy,
        clientSnapshot: normalizedClientSnapshot,
        serverCalculation: computedRateBreakdown
      });
      
      throw new Error('Quote request rejected: Rate calculation discrepancy detected. Please recalculate your quote.');
    }

    const minDays = serviceType === "express" ? Math.max(1, destination.transit_days_min - 1) : destination.transit_days_min
    const maxDays = serviceType === "express" ? Math.max(2, destination.transit_days_max - 1) : destination.transit_days_max
    const estimatedTransitDays = Math.round((minDays + maxDays) / 2)
    const transitLabel = `${minDays}-${maxDays} business days`

    const quoteReference = generateQuoteReference(destination.airport_code)

    const documentDimensions = hasDimensions
      ? {
          length: normalizedDimensions.length ?? undefined,
          width: normalizedDimensions.width ?? undefined,
          height: normalizedDimensions.height ?? undefined
        }
      : undefined

    const issuedAt = new Date().toISOString()

    const quoteDocumentPayload: QuoteDocumentPayload = {
      quoteReference,
      customerName: customerInfo.fullName,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone || null,
      createdAt: issuedAt,
      expiresAt: expiresAt.toISOString(),
      origin: {
        name: COMPANY_CONTACT.name,
        address: COMPANY_CONTACT.address,
        phone: COMPANY_CONTACT.phone,
        email: COMPANY_CONTACT.email
      },
      destination: {
        country: destination.country_name,
        city: destination.city_name,
        airportCode: destination.airport_code
      },
      packageDetails: {
        actualWeightLbs: roundToTwo(weightValue),
        billableWeightLbs: roundToTwo(billableWeight),
        dimensionalWeightLbs: dimensionalWeight ? roundToTwo(dimensionalWeight) : null,
        dimensions: documentDimensions,
        declaredValue: roundToTwo(declaredValueNumber),
        serviceType
      },
      rateBreakdown: {
        baseShippingCost: computedRateBreakdown.baseShippingCost,
        consolidationFee: computedRateBreakdown.consolidationFee,
        handlingFee: computedRateBreakdown.handlingFee,
        insuranceCost: computedRateBreakdown.insuranceCost,
        totalCost: computedRateBreakdown.totalCost,
        expressSurcharge: computedRateBreakdown.expressSurcharge
      },
      transitEstimate: {
        min: minDays,
        max: maxDays,
        average: estimatedTransitDays,
        label: transitLabel
      },
      notes: specialInstructions || null,
      terms: DEFAULT_TERMS,
      callToActionUrl: `${COMPANY_CONTACT.website}/booking`
    }

    const quoteDocumentHtml = generateQuoteHtml(quoteDocumentPayload)

    let quoteDocumentPdfBase64: string | null = null
    try {
      const pdfBytes = await generateQuotePdf(quoteDocumentPayload)
      const byteArray = new Uint8Array(pdfBytes)
      let binary = ""
      for (let i = 0; i < byteArray.length; i++) {
        binary += String.fromCharCode(byteArray[i])
      }
      quoteDocumentPdfBase64 = btoa(binary)
    } catch (error) {
      console.error("Failed to generate quote PDF:", error)
    }

    const quoteMetadata: Record<string, unknown> = {
      transit_label: transitLabel,
      transit_estimate: {
        min: minDays,
        max: maxDays,
        average: estimatedTransitDays,
        label: transitLabel
      },
      terms: DEFAULT_TERMS,
      follow_up_due_at: followUpDueAt.toISOString(),
      follow_up_window_days: 3,
      call_to_action: `${COMPANY_CONTACT.website}/booking`,
      destination: {
        country: destination.country_name,
        city: destination.city_name,
        airport_code: destination.airport_code
      },
      weight: {
        actual: roundToTwo(weightValue),
        billable: roundToTwo(billableWeight),
        dimensional: dimensionalWeight ? roundToTwo(dimensionalWeight) : null,
        rate_per_lb: computedRateBreakdown.ratePerLb
      },
      rate_breakdown: computedRateBreakdown,
      calculation_flagged: false, // No tampering since we reject on any discrepancy
      calculation_validated_at: issuedAt
    }

    if (normalizedClientSnapshot) {
      quoteMetadata["client_rate_snapshot"] = normalizedClientSnapshot
    }

    // Note: discrepancy tracking removed since we reject on any discrepancy

    const quoteData: Record<string, unknown> = {
      customer_id: customerId,
      email: customerInfo.email,
      full_name: customerInfo.fullName,
      phone: customerInfo.phone || null,
      destination_id: destinationId,
      weight_lbs: roundToTwo(weightValue),
      length_inches: normalizedDimensions.length ?? null,
      width_inches: normalizedDimensions.width ?? null,
      height_inches: normalizedDimensions.height ?? null,
      service_type: serviceType,
      declared_value: roundToTwo(declaredValueNumber),
      base_shipping_cost: computedRateBreakdown.baseShippingCost,
      consolidation_fee: computedRateBreakdown.consolidationFee,
      handling_fee: computedRateBreakdown.handlingFee,
      insurance_cost: computedRateBreakdown.insuranceCost,
      total_cost: computedRateBreakdown.totalCost,
      estimated_transit_days: estimatedTransitDays,
      special_instructions: specialInstructions || null,
      status: "pending",
      quote_expires_at: expiresAt.toISOString(),
      created_at: issuedAt,
      quote_reference: quoteReference,
      quote_document_html: quoteDocumentHtml,
      quote_metadata: quoteMetadata,
      follow_up_status: "scheduled",
      follow_up_due_at: followUpDueAt.toISOString(),
      last_follow_up_at: null,
      follow_up_method: "email",
      pdf_attachment_present: Boolean(quoteDocumentPdfBase64)
    }

    const quoteResponse = await fetch(`${supabaseUrl}/rest/v1/shipping_quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(quoteData)
    })

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text()
      throw new Error(`Failed to save quote: ${errorText}`)
    }

    const savedQuote = await quoteResponse.json()
    const quoteRecord = savedQuote[0]

    const expirationLabel = expiresAt.toLocaleDateString('en-US', { dateStyle: 'medium' })
    const notificationContent = {
      title: `Quote ${quoteReference} Ready`,
      message: `Hi ${customerInfo.fullName}, your QCS Cargo quote ${quoteReference} is ready to review.`,
      actionText: 'View Quote Details',
      actionUrl: `${COMPANY_CONTACT.website}/dashboard/quotes`,
      details: [
        { label: 'Total Cost', value: `$${computedRateBreakdown.totalCost.toFixed(2)}` },
        { label: 'Transit Estimate', value: transitLabel },
        { label: 'Expires', value: expirationLabel }
      ],
      footerNote: 'Reply to this message or email us to continue with booking.'
    }

    let emailDispatched = false
    let emailError: string | null = null

    if (resendApiKey) {
      try {
        const emailPayload: Record<string, unknown> = {
          from: `${COMPANY_CONTACT.name} <${COMPANY_CONTACT.email}>`,
          to: [customerInfo.email],
          subject: `Your QCS Cargo Quote ${quoteReference}`,
          html: quoteDocumentHtml,
          reply_to: COMPANY_CONTACT.email,
          tags: [
            { name: "quote_reference", value: quoteReference },
            { name: "service_type", value: serviceType }
          ]
        }

        if (quoteDocumentPdfBase64) {
          emailPayload["attachments"] = [
            {
              filename: `${quoteReference}.pdf`,
              content: quoteDocumentPdfBase64,
              contentType: "application/pdf"
            }
          ]
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

        emailDispatched = true
      } catch (error) {
        console.error("Failed to send quote email:", error)
        emailError = error instanceof Error ? error.message : "Unknown error"
      }
    } else {
      emailError = "Resend API key not configured"
      console.warn("Resend API key missing - quote email not sent")
    }

    const whatsappConfig = {
      accountSid: Deno.env.get('TWILIO_ACCOUNT_SID'),
      authToken: Deno.env.get('TWILIO_AUTH_TOKEN'),
      fromNumber: Deno.env.get('TWILIO_WHATSAPP_FROM')
    }

    const recipientNumber = formatWhatsAppNumber(customerInfo.phone || null, null)
    const hasWhatsAppConfig =
      whatsappConfig.accountSid &&
      whatsappConfig.authToken &&
      whatsappConfig.fromNumber

    if (recipientNumber && hasWhatsAppConfig) {
      const messageBody = generateNotificationText(notificationContent)
      if (messageBody) {
        const whatsappResult = await sendWhatsAppMessage(whatsappConfig, {
          to: recipientNumber,
          body: messageBody
        })

        if (!whatsappResult.success) {
          console.warn('Failed to send WhatsApp quote notification:', whatsappResult.error)
        }
      }
    } else if (recipientNumber && !hasWhatsAppConfig) {
      console.warn('WhatsApp configuration missing - skipping quote notification')
    }

    const result = {
      success: true,
      message: emailDispatched
        ? "Quote request saved and emailed successfully."
        : "Quote saved successfully. Email delivery pending.",
      quoteId: quoteRecord.id,
      expiresAt: quoteRecord.quote_expires_at,
      totalCost: quoteRecord.total_cost,
        estimatedTransitDays: quoteRecord.estimated_transit_days,
        quoteReference,
        emailDispatched,
        emailError,
        quoteDocumentHtml,
        pdfAttachmentIncluded: Boolean(quoteDocumentPdfBase64),
        calculationFlagged: false, // No tampering since we reject on any discrepancy
        billableWeight: roundToTwo(billableWeight),
        dimensionalWeight: dimensionalWeight ? roundToTwo(dimensionalWeight) : null,
        ratePerLb: computedRateBreakdown.ratePerLb
      }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Quote request error:", error)
    const errorResponse = {
      error: {
        code: "QUOTE_REQUEST_FAILED",
        message: error instanceof Error ? error.message : "Unable to process quote request"
      }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
