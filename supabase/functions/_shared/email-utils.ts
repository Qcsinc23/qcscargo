/**
 * Shared email utilities for sending notifications via Resend
 */

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: string
    contentType: string
  }>
  tags?: Array<{
    name: string
    value: string
  }>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

const DEFAULT_FROM = "QCS Cargo <quotes@qcs-cargo.com>"
const DEFAULT_REPLY_TO = "quotes@qcs-cargo.com"

/**
 * Send email via Resend API
 */
export async function sendEmail(
  apiKey: string | undefined,
  payload: EmailPayload
): Promise<SendEmailResult> {
  if (!apiKey) {
    return {
      success: false,
      error: "Resend API key not configured"
    }
  }

  try {
    const emailPayload: Record<string, unknown> = {
      from: payload.from || DEFAULT_FROM,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo || DEFAULT_REPLY_TO
    }

    if (payload.attachments && payload.attachments.length > 0) {
      emailPayload["attachments"] = payload.attachments
    }

    if (payload.tags && payload.tags.length > 0) {
      emailPayload["tags"] = payload.tags
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${errorText}`)
    }

    const result = await response.json()
    return {
      success: true,
      messageId: result.id
    }
  } catch (error) {
    console.error("Failed to send email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Generate HTML email template for notifications
 */
export function generateNotificationEmail(options: {
  title: string
  message: string
  actionText?: string
  actionUrl?: string
  details?: Array<{ label: string; value: string }>
  footerNote?: string
}): string {
  const { title, message, actionText, actionUrl, details, footerNote } = options

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .tagline {
      font-size: 12px;
      color: #64748b;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 15px;
    }
    .message {
      font-size: 16px;
      color: #475569;
      margin-bottom: 20px;
      line-height: 1.8;
    }
    .details {
      background-color: #f8fafc;
      border-left: 3px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .detail-value {
      color: #1e293b;
      font-size: 14px;
      text-align: right;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .footer-note {
      background-color: #fef3c7;
      border-left: 3px solid #f59e0b;
      padding: 10px 15px;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">QCS Cargo</div>
      <div class="tagline">Precision Caribbean Air Cargo</div>
    </div>

    <div class="title">${title}</div>
    
    <div class="message">${message}</div>

    ${details && details.length > 0 ? `
    <div class="details">
      ${details.map(detail => `
        <div class="detail-row">
          <span class="detail-label">${detail.label}:</span>
          <span class="detail-value">${detail.value}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${actionUrl && actionText ? `
    <div style="text-align: center;">
      <a href="${actionUrl}" class="button">${actionText}</a>
    </div>
    ` : ''}

    ${footerNote ? `
    <div class="footer-note">${footerNote}</div>
    ` : ''}

    <div class="footer">
      <p>QCS Cargo • 35 Obrien Street, Kearny, NJ 07032</p>
      <p>201-249-0929 • quotes@qcs-cargo.com</p>
      <p><a href="https://www.qcs-cargo.com" style="color: #3b82f6;">www.qcs-cargo.com</a></p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

