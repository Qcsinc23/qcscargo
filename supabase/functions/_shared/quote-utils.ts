import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib"

export interface QuoteDocumentPayload {
  quoteReference: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  createdAt: string
  expiresAt: string
  origin: {
    name: string
    address: string
    phone: string
    email: string
  }
  destination: {
    country: string
    city?: string | null
    airportCode?: string | null
  }
  packageDetails: {
    actualWeightLbs: number
    billableWeightLbs: number
    dimensionalWeightLbs?: number | null
    dimensions?: {
      length?: number | null
      width?: number | null
      height?: number | null
    }
    declaredValue?: number | null
    serviceType: "standard" | "express"
  }
  rateBreakdown: {
    baseShippingCost: number
    consolidationFee: number
    handlingFee: number
    insuranceCost: number
    totalCost: number
    expressSurcharge?: number
  }
  transitEstimate?: {
    min?: number | null
    max?: number | null
    average?: number | null
    label?: string | null
  }
  notes?: string | null
  terms?: string[]
  callToActionUrl?: string
}

export const DEFAULT_TERMS: string[] = [
  "Liability limitations: QCS Cargo is not responsible for indirect, incidental, or consequential damages beyond the declared insurance coverage.",
  "Insurance requirements: Shipments valued over $2,500 require supplemental insurance documentation prior to tendering freight.",
  "Customs responsibilities: Consignees are responsible for providing accurate documentation and paying any duties, taxes, or customs-related fees upon arrival.",
  "Payment terms: Quotes are valid for the stated period and require payment in full prior to cargo departure unless otherwise agreed in writing.",
  "Cancellation policy: Bookings cancelled within 24 hours of scheduled departure may incur up to 50% of quoted charges.",
  "Dispute resolution: Any disputes will be handled in accordance with New Jersey state law and must be submitted in writing within 10 days of delivery notification."
]

export const COMPANY_CONTACT = {
  name: "QCS Cargo",
  tagline: "Precision Caribbean Air Cargo",
  address: "35 Obrien Street, Kearny, NJ 07032",
  phone: "201-249-0929",
  email: "quotes@qcscargo.com",
  website: "https://www.qcscargo.com"
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value)
}

export const formatWeight = (weightLbs: number | null | undefined) => {
  if (typeof weightLbs !== "number" || Number.isNaN(weightLbs)) {
    return "N/A"
  }
  return `${weightLbs.toFixed(2)} lbs`
}

export const generateQuoteReference = (prefix?: string | null) => {
  const now = new Date()
  const dateSegment = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const randomSegment = Math.floor(Math.random() * 9000 + 1000)
  const normalizedPrefix = prefix?.replace(/[^A-Z0-9]/gi, "").toUpperCase()
  return `QCS-${dateSegment}-${normalizedPrefix ? `${normalizedPrefix}-` : ""}${randomSegment}`
}

const htmlStyles = `
  body { font-family: 'Inter', 'Helvetica', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; background: #f8fafc; }
  .wrapper { max-width: 720px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
  .brand { display: flex; flex-direction: column; }
  .brand-title { font-size: 24px; font-weight: 800; color: #6d28d9; margin: 0; }
  .brand-tagline { font-size: 14px; color: #475569; margin-top: 4px; }
  .quote-meta { text-align: right; font-size: 12px; color: #64748b; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  .info-card { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
  .info-card h4 { margin: 0 0 8px 0; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; }
  .info-card p { margin: 2px 0; font-size: 14px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 12px; text-align: left; font-size: 14px; }
  thead th { background: #ede9fe; color: #4c1d95; font-weight: 600; }
  tbody td { border-bottom: 1px solid #e2e8f0; }
  .total-row td { font-size: 16px; font-weight: 700; color: #0f172a; }
  .terms { background: #f1f5f9; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
  .terms li { margin-bottom: 8px; color: #475569; font-size: 13px; line-height: 1.5; }
  .cta { margin-top: 24px; text-align: center; }
  .cta-button { display: inline-block; padding: 14px 28px; border-radius: 9999px; background: linear-gradient(135deg, #9333ea, #6366f1); color: #ffffff; text-decoration: none; font-weight: 600; box-shadow: 0 12px 30px rgba(99, 102, 241, 0.35); }
  .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center; }
`

const serviceTypeLabels: Record<string, string> = {
  standard: "Standard Air Freight",
  express: "Express Priority"
}

export const generateQuoteHtml = (payload: QuoteDocumentPayload) => {
  const {
    quoteReference,
    customerName,
    customerEmail,
    customerPhone,
    createdAt,
    expiresAt,
    origin,
    destination,
    packageDetails,
    rateBreakdown,
    transitEstimate,
    notes,
    terms = DEFAULT_TERMS,
    callToActionUrl = `${COMPANY_CONTACT.website}/booking`
  } = payload

  const createdDate = new Date(createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })
  const serviceLabel = serviceTypeLabels[packageDetails.serviceType] || packageDetails.serviceType

  const dimensionsLine = packageDetails.dimensions?.length && packageDetails.dimensions?.width && packageDetails.dimensions?.height
    ? `${packageDetails.dimensions.length}" L × ${packageDetails.dimensions.width}" W × ${packageDetails.dimensions.height}" H`
    : "Provided upon booking"

  const declaredValueLine = packageDetails.declaredValue && packageDetails.declaredValue > 0
    ? formatCurrency(packageDetails.declaredValue)
    : "Will be confirmed prior to departure"

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>QCS Cargo Quotation ${quoteReference}</title>
    <style>${htmlStyles}</style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <div class="brand">
          <span class="brand-title">${COMPANY_CONTACT.name}</span>
          <span class="brand-tagline">${COMPANY_CONTACT.tagline}</span>
        </div>
        <div class="quote-meta">
          <p><strong>Quote:</strong> ${quoteReference}</p>
          <p><strong>Issued:</strong> ${createdDate}</p>
          <p><strong>Valid Until:</strong> ${expirationDate}</p>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">Client Overview</h3>
        <div class="info-grid">
          <div class="info-card">
            <h4>Recipient</h4>
            <p>${customerName}</p>
            <p>${customerEmail}</p>
            ${customerPhone ? `<p>${customerPhone}</p>` : ""}
          </div>
          <div class="info-card">
            <h4>Origin Facility</h4>
            <p>${origin.name}</p>
            <p>${origin.address}</p>
            <p>${origin.phone}</p>
            <p>${origin.email}</p>
          </div>
          <div class="info-card">
            <h4>Destination</h4>
            <p>${destination.city ? `${destination.city}, ` : ""}${destination.country}</p>
            <p>${destination.airportCode ? `Airport Code: ${destination.airportCode}` : ""}</p>
            ${transitEstimate?.label ? `<p>Estimated Transit: ${transitEstimate.label}</p>` : ""}
          </div>
        </div>
      </div>

        <div class="section">
          <h3 class="section-title">Package & Service Details</h3>
          <div class="info-grid">
            <div class="info-card">
              <h4>Service Level</h4>
              <p>${serviceLabel}</p>
              ${transitEstimate?.average ? `<p>Avg Transit: ${transitEstimate.average} days</p>` : ""}
            </div>
            <div class="info-card">
              <h4>Weight Metrics</h4>
              <p>Actual Weight: ${formatWeight(packageDetails.actualWeightLbs)}</p>
              <p>Billable Weight: ${formatWeight(packageDetails.billableWeightLbs)}</p>
              ${packageDetails.dimensionalWeightLbs ? `<p>Dimensional Weight: ${formatWeight(packageDetails.dimensionalWeightLbs)}</p>` : ""}
            </div>
            <div class="info-card">
              <h4>Dimensions & Value</h4>
              <p>Dimensions: ${dimensionsLine}</p>
              <p>Declared Value: ${declaredValueLine}</p>
              <p>Insurance: ${formatCurrency(rateBreakdown.insuranceCost)}</p>
            </div>
          </div>
        </div>

      <div class="section">
        <h3 class="section-title">Investment Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Air Cargo Transport (${serviceLabel})</td>
              <td>${formatCurrency(rateBreakdown.baseShippingCost)}</td>
            </tr>
            ${rateBreakdown.consolidationFee ? `<tr><td>Consolidation & Processing</td><td>${formatCurrency(rateBreakdown.consolidationFee)}</td></tr>` : ""}
            ${rateBreakdown.handlingFee ? `<tr><td>Handling & Security Screening</td><td>${formatCurrency(rateBreakdown.handlingFee)}</td></tr>` : ""}
            ${rateBreakdown.expressSurcharge ? `<tr><td>Express Priority Surcharge</td><td>${formatCurrency(rateBreakdown.expressSurcharge)}</td></tr>` : ""}
            ${rateBreakdown.insuranceCost ? `<tr><td>Insurance Coverage</td><td>${formatCurrency(rateBreakdown.insuranceCost)}</td></tr>` : ""}
            <tr class="total-row">
              <td>Total Investment</td>
              <td>${formatCurrency(rateBreakdown.totalCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3 class="section-title">Terms & Conditions</h3>
        <div class="terms">
          <ol>
            ${terms.map(term => `<li>${term}</li>`).join("")}
          </ol>
        </div>
      </div>

      ${notes ? `<div class="section"><h3 class="section-title">Special Instructions</h3><div class="info-card"><p>${notes}</p></div></div>` : ""}

      <div class="cta">
        <a class="cta-button" href="${callToActionUrl}" target="_blank" rel="noopener noreferrer">Confirm Booking with QCS Cargo</a>
        <p style="margin-top: 12px; font-size: 12px; color: #64748b;">Have questions? Call us at ${origin.phone} or reply to this email.</p>
      </div>

      <div class="footer">
        <p>${COMPANY_CONTACT.name} • ${COMPANY_CONTACT.address} • ${COMPANY_CONTACT.phone}</p>
        <p>${COMPANY_CONTACT.email} • ${COMPANY_CONTACT.website}</p>
      </div>
    </div>
  </body>
  </html>`
}

const wrapText = (text: string, font: any, fontSize: number, maxWidth: number) => {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

export const generateQuotePdf = async (payload: QuoteDocumentPayload) => {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 48
  let cursorY = 792 - margin
  const lineHeight = 18
  const maxWidth = 612 - margin * 2

  const drawHeader = (title: string) => {
    cursorY -= lineHeight
    page.drawText(title, { x: margin, y: cursorY, size: 18, font: boldFont, color: rgb(0.25, 0.11, 0.58) })
    cursorY -= lineHeight / 2
  }

  const drawSubheading = (text: string) => {
    cursorY -= lineHeight
    page.drawText(text, { x: margin, y: cursorY, size: 12, font: boldFont, color: rgb(0.23, 0.26, 0.34) })
  }

  const drawParagraph = (text: string, options: { bullet?: boolean } = {}) => {
    const lines = wrapText(text, font, 11, maxWidth)
    for (const line of lines) {
      cursorY -= lineHeight
      const xPosition = options.bullet ? margin + 12 : margin
      if (options.bullet) {
        page.drawText("•", { x: margin, y: cursorY, size: 11, font })
      }
      page.drawText(line, { x: xPosition, y: cursorY, size: 11, font, color: rgb(0.25, 0.28, 0.34) })
    }
  }

  drawHeader("QCS Cargo Quotation")
  drawParagraph(`${COMPANY_CONTACT.name} • ${COMPANY_CONTACT.phone} • ${COMPANY_CONTACT.email}`)
  drawParagraph(`${COMPANY_CONTACT.address}`)

  cursorY -= lineHeight
  drawSubheading(`Quote Reference: ${payload.quoteReference}`)
  drawParagraph(`Issued: ${new Date(payload.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`)
  drawParagraph(`Valid Until: ${new Date(payload.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`)

  cursorY -= lineHeight
  drawSubheading("Client & Shipment Details")
  drawParagraph(`Prepared for: ${payload.customerName} (${payload.customerEmail}${payload.customerPhone ? ` • ${payload.customerPhone}` : ""})`)
  drawParagraph(`Destination: ${payload.destination.city ? `${payload.destination.city}, ` : ""}${payload.destination.country}${payload.destination.airportCode ? ` • Airport: ${payload.destination.airportCode}` : ""}`)
  drawParagraph(`Service Level: ${serviceTypeLabels[payload.packageDetails.serviceType] || payload.packageDetails.serviceType}`)
  drawParagraph(`Actual Weight: ${formatWeight(payload.packageDetails.actualWeightLbs)}`)
  drawParagraph(`Billable Weight: ${formatWeight(payload.packageDetails.billableWeightLbs)}`)

  if (payload.packageDetails.dimensionalWeightLbs) {
    drawParagraph(`Dimensional Weight: ${formatWeight(payload.packageDetails.dimensionalWeightLbs)}`)
  }

  if (payload.packageDetails.dimensions?.length && payload.packageDetails.dimensions?.width && payload.packageDetails.dimensions?.height) {
    drawParagraph(`Dimensions: ${payload.packageDetails.dimensions.length}" L × ${payload.packageDetails.dimensions.width}" W × ${payload.packageDetails.dimensions.height}" H`)
  }

  if (payload.packageDetails.declaredValue) {
    drawParagraph(`Declared Value: ${formatCurrency(payload.packageDetails.declaredValue)}`)
  }

  if (payload.transitEstimate?.label) {
    drawParagraph(`Estimated Transit: ${payload.transitEstimate.label}`)
  }

  cursorY -= lineHeight
  drawSubheading("Investment Summary")
  drawParagraph(`Base Shipping Cost: ${formatCurrency(payload.rateBreakdown.baseShippingCost)}`)
  if (payload.rateBreakdown.consolidationFee) {
    drawParagraph(`Consolidation Fee: ${formatCurrency(payload.rateBreakdown.consolidationFee)}`)
  }
  if (payload.rateBreakdown.handlingFee) {
    drawParagraph(`Handling Fee: ${formatCurrency(payload.rateBreakdown.handlingFee)}`)
  }
  if (payload.rateBreakdown.expressSurcharge) {
    drawParagraph(`Express Surcharge: ${formatCurrency(payload.rateBreakdown.expressSurcharge)}`)
  }
  if (payload.rateBreakdown.insuranceCost) {
    drawParagraph(`Insurance: ${formatCurrency(payload.rateBreakdown.insuranceCost)}`)
  }
  drawParagraph(`Total: ${formatCurrency(payload.rateBreakdown.totalCost)}`)

  cursorY -= lineHeight
  drawSubheading("Terms & Conditions")
  const terms = payload.terms && payload.terms.length ? payload.terms : DEFAULT_TERMS
  for (const term of terms) {
    drawParagraph(term, { bullet: true })
  }

  if (payload.notes) {
    cursorY -= lineHeight
    drawSubheading("Special Instructions")
    drawParagraph(payload.notes)
  }

  cursorY -= lineHeight
  drawParagraph("To confirm your shipment, please contact the QCS Cargo team or visit our booking portal.")

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
