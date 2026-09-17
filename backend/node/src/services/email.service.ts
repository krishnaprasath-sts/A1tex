import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'
import stream from 'node:stream'
import { promisify } from 'node:util'
import { env } from '../config/env.js'
import { generateInvoicePdf } from './order-invoice-pdf.service.js'
import { getCompanyInfo } from './settings.service.js'

const pipeline = promisify(stream.pipeline)

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST || 'smtp.gmail.com',
  port: env.EMAIL_PORT || 587,
  secure: env.EMAIL_PORT === 465,
  auth: {
    user: env.EMAIL_USER || '',
    pass: (env.EMAIL_PASS || '').replace(/\s+/g, ''),
  },
  tls: {
    rejectUnauthorized: false,
  },
})

async function pdfToBuffer(order: Record<string, unknown>, invoice: Record<string, unknown>, company?: Record<string, unknown>): Promise<Buffer> {
  const doc = generateInvoicePdf(order, invoice, company as any)
  const chunks: Buffer[] = []
  const passthrough = new stream.PassThrough()
  passthrough.on('data', (chunk: Buffer) => chunks.push(chunk))
  await pipeline(doc, passthrough)
  return Buffer.concat(chunks)
}

function emailFrom(companyName: string) {
  const fromEmail = env.EMAIL_USER || 'hello@a1tex.com'
  return `"${companyName}" <${fromEmail}>`
}


function resolveLogoUrl(company: any): string | null {
  if (company?.logoUrl && typeof company.logoUrl === 'string') {
    const trimmed = company.logoUrl.trim()
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return trimmed
    }
  }
  const frontendUrl = env.FRONTEND_URL || ''
  if (frontendUrl.startsWith('https://')) {
    return `${frontendUrl}/a1-tex-logo-transparent.png`
  }
  return null
}

function resolveLogoAttachment(_company?: any): any | null {
  // IMPORTANT: Never attach logo as a MIME attachment.
  // In email clients (specifically Gmail), attaching an image file causes Gmail
  // to display a prominent "logo.png" download chip on the outside in the user's
  // inbox list view. The logo is rendered via clean inline HTML / external URL instead.
  return null
}

function wrapInEmailTemplate(
  contentHtml: string,
  previewText: string,
  logoExistsOrUrl: boolean | string | null | undefined,
  companyName: string,
  optionalLogoUrl?: string | null,
) {
  const logoUrl = typeof logoExistsOrUrl === 'string' && (logoExistsOrUrl.startsWith('http://') || logoExistsOrUrl.startsWith('https://'))
    ? logoExistsOrUrl
    : (optionalLogoUrl || null)

  const headerHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" class="logo" style="max-height: 50px; max-width: 180px; width: auto; display: inline-block;" />`
    : `<h1 class="logo-text" style="color: #6B1A2A; font-family: Georgia, serif; font-size: 26px; font-weight: bold; margin: 0; letter-spacing: 2px; text-transform: uppercase;">${companyName}</h1>
       <div style="color: #C29B57; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 5px; font-weight: 600;">India's No.1 Online Saree Shopping</div>`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${previewText}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8f5f0; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e8dcc4; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background-color: #FBF9F6; padding: 24px 30px; text-align: center; border-bottom: 3px solid #6B1A2A; }
    .logo { max-height: 50px; max-width: 180px; width: auto; display: inline-block; }
    .logo-text { color: #6B1A2A; font-family: Georgia, serif; font-size: 26px; font-weight: bold; margin: 0; letter-spacing: 2px; }
    .content { padding: 35px 30px; color: #333333; }
    .footer { background-color: #faf7f2; padding: 20px 30px; text-align: center; font-size: 11px; color: #999999; border-top: 1px solid #e8dcc4; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      ${headerHtml}
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      This is an automated notification from ${companyName}. Please do not reply directly to this email.<br/>
      &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
    </div>
  </div>
</body>
</html>
  `
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping OTP email.')
    return
  }

  const company = await getCompanyInfo()
  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) {
    attachments.push(logoAttachment)
  }

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 15px;">Dear Customer,</div>
    <div style="font-size: 14.5px; line-height: 1.6; color: #555555; margin-bottom: 20px;">
      We received a request to reset your password. Use the verification code below to proceed:
    </div>
    <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #faf7f2; border: 1px solid #e8dcc4; border-radius: 8px;">
      <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6B1A2A; display: inline-block;">${otp}</span>
    </div>
    <div style="font-size: 14px; color: #777777; margin-bottom: 25px;">
      This code is secure and will expire in 15 minutes. If you did not make this request, you can safely ignore this email.
    </div>
    `,
    'Your Password Reset OTP',
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Your ${company.name} Password Reset OTP`,
      text: `Your password reset OTP is: ${otp}. This OTP expires in 15 minutes.`,
      html,
      attachments,
    })
    console.log(`[Email] OTP sent to ${to}`)
  } catch (err) {
    console.error(`[Email] Failed to send OTP email to ${to}:`, err)
    throw err
  }
}

// ─── Customer Order Receipt Email (replaces Tax Invoice email) ───────────────
// This sends a simple, customer-friendly order receipt.
// The Tax Invoice PDF (with GST/PAN/CGST breakdown) remains admin-only via the admin panel.

export async function sendInvoiceEmail(
  to: string,
  invoice: Record<string, unknown>,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping order receipt email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  // Build detailed order items — each item shows color, size, GST breakdown
  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemRowsHtml = items.length > 0
    ? items.map(item => {
        const qty = Number(item.quantity || 1)
        const unitPrice = Number(item.unitPrice || item.price || 0)
        const lineTotal = Number(item.total || (qty * unitPrice))
        // GST is inclusive in the price. Default textile GST = 5%
        const gstRate = Number((item as any).gstRate || 5)
        const taxable = lineTotal / (1 + gstRate / 100)
        const gstAmt = lineTotal - taxable

        const color = String(item.color || '')
        const size = String(item.size || '')
        const variantLabel = String(item.variantLabel || '')

        // Build attribute chips
        const chips: string[] = []
        if (color) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">🎨 ${color}</span>`)
        if (size) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">📐 ${size}</span>`)
        if (!color && !size && variantLabel) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;">${variantLabel}</span>`)

        const gstBreakdown = `
          <div style="margin-top:8px;padding:8px 10px;background:#fffdf8;border:1px dashed #e8dcc4;border-radius:6px;font-size:11px;color:#666;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:2px 0;color:#888;">Taxable Value</td>
                <td style="padding:2px 0;text-align:right;color:#555;">₹${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;color:#888;">GST @ ${gstRate}% (incl.)</td>
                <td style="padding:2px 0;text-align:right;color:#888;">₹${gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr style="border-top:1px solid #e8dcc4;">
                <td style="padding:3px 0 0;font-weight:bold;color:#444;">Total (incl. GST)</td>
                <td style="padding:3px 0 0;text-align:right;font-weight:bold;color:#6B1A2A;">₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>`

        return `
          <tr style="border-bottom: 1px solid #f0e8d8;">
            <td style="padding: 14px 10px; font-size: 14px; color: #333333; vertical-align: top;">
              <div style="font-weight:bold;color:#2a0a10;font-size:14px;margin-bottom:4px;">${String(item.name || '')}</div>
              ${chips.length ? `<div style="margin-bottom:6px;">${chips.join('')}</div>` : ''}
              ${gstBreakdown}
            </td>
            <td style="padding: 14px 10px; font-size: 14px; color: #555555; text-align: center; vertical-align: top; white-space:nowrap;">${qty}</td>
            <td style="padding: 14px 10px; font-size: 14px; color: #555555; text-align: right; vertical-align: top; white-space:nowrap;">₹${unitPrice.toLocaleString('en-IN')}</td>
            <td style="padding: 14px 10px; font-size: 14px; font-weight: bold; color: #333333; text-align: right; vertical-align: top; white-space:nowrap;">₹${lineTotal.toLocaleString('en-IN')}</td>
          </tr>`
      }).join('')
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #888;">No items found.</td></tr>`

  // Shipping address block
  const addr = order.shippingAddress as Record<string, unknown> | null | undefined
  const shippingBlock = addr
    ? `<div style="margin-top: 20px; padding: 16px; background-color: #faf7f2; border: 1px solid #e8dcc4; border-radius: 8px;">
        <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #6B1A2A; margin-bottom: 8px;">Shipping To</div>
        <div style="font-size: 13px; color: #444444; line-height: 1.7;">
          ${[String(addr.firstName || ''), String(addr.lastName || '')].filter(Boolean).join(' ')}<br/>
          ${String(addr.address || '')}<br/>
          ${[String(addr.city || ''), String(addr.state || '')].filter(Boolean).join(', ')}${addr.pincode ? ` — ${addr.pincode}` : ''}<br/>
          Phone: ${String(addr.phone || '')}
        </div>
      </div>`
    : ''

  // Discount row
  const discount = Number(order.discount || 0)
  const discountRow = discount > 0
    ? `<tr>
        <td colspan="3" style="padding: 6px 8px; font-size: 13px; color: #555555; text-align: right;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td>
        <td style="padding: 6px 8px; font-size: 13px; color: #d9534f; font-weight: bold; text-align: right;">−₹${discount.toLocaleString('en-IN')}</td>
      </tr>`
    : ''

  const shipping = Number(order.shippingTotal || 0)
  const totalGst = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 1)
    const unitPrice = Number(item.unitPrice || item.price || 0)
    const lineTotal = Number(item.total || (qty * unitPrice))
    const gstRate = Number((item as any).gstRate || 5)
    return sum + (lineTotal - lineTotal / (1 + gstRate / 100))
  }, 0)

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Thank you for your order! 🎉</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> has been placed successfully.
      We'll notify you once it's dispatched.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Order Summary — ${orderNumber}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #faf7f2; border-bottom: 2px solid #e8dcc4;">
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: left;">Product</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: right;">Price</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
        <tfoot style="border-top: 2px solid #e8dcc4;">
          <tr>
            <td colspan="3" style="padding: 8px 8px; font-size: 13px; color: #555555; text-align: right;">Subtotal</td>
            <td style="padding: 8px 8px; font-size: 13px; color: #333333; font-weight: bold; text-align: right;">₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 6px 8px; font-size: 13px; color: #555555; text-align: right;">Shipping</td>
            <td style="padding: 6px 8px; font-size: 13px; color: #333333; text-align: right;">${shipping === 0 ? '<span style="color: #2d8a4e; font-weight: bold;">FREE</span>' : `₹${shipping.toLocaleString('en-IN')}`}</td>
          </tr>
          ${discountRow}
          <tr style="background-color: #fffdf5; border-top: 1px solid #e8dcc4;">
            <td colspan="3" style="padding: 8px 8px 4px; font-size: 12px; color: #888888; text-align: right;">GST Included in Price</td>
            <td style="padding: 8px 8px 4px; font-size: 12px; color: #888888; text-align: right;">₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background-color: #fcf4f5;">
            <td colspan="3" style="padding: 12px 8px; font-size: 15px; font-weight: bold; color: #6B1A2A; text-align: right;">Grand Total</td>
            <td style="padding: 12px 8px; font-size: 16px; font-weight: bold; color: #6B1A2A; text-align: right;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${shippingBlock}

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Order Received — ${orderNumber}`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Order Received — ${orderNumber} | ${company.name}`,
      text: [
        `Thank you for your order!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Grand Total: ₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`,
        ``,
        `We'll notify you once your order is dispatched.`,
        ``,
        `Track your order at: ${frontendUrl}/track-order?orderNumber=${encodeURIComponent(orderNumber)}`,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Order receipt sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send order receipt to ${to}:`, err)
    throw err
  }
}

// ─── Abandoned Cart Recovery Email ───────────────────────

export async function sendAbandonedCartEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping abandoned cart email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'
  const shopUrl = `${frontendUrl}/shop`

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemRowsHtml = items.length > 0
    ? items.map(item => {
        const qty = Number(item.quantity || 1)
        const unitPrice = Number(item.unitPrice || item.price || 0)
        const lineTotal = Number(item.total || (qty * unitPrice))

        const color = String(item.color || '')
        const size = String(item.size || '')
        const variantLabel = String(item.variantLabel || '')

        const chips: string[] = []
        if (color) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">🎨 ${color}</span>`)
        if (size) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">📐 ${size}</span>`)
        if (!color && !size && variantLabel) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;">${variantLabel}</span>`)

        return `
          <tr style="border-bottom: 1px solid #f0e8d8;">
            <td style="padding: 14px 10px; font-size: 14px; color: #333333; vertical-align: top;">
              <div style="font-weight:bold;color:#2a0a10;font-size:14px;margin-bottom:4px;">${String(item.name || '')}</div>
              ${chips.length ? `<div style="margin-bottom:6px;">${chips.join('')}</div>` : ''}
            </td>
            <td style="padding: 14px 10px; font-size: 14px; color: #555555; text-align: center; vertical-align: top; white-space:nowrap;">${qty}</td>
            <td style="padding: 14px 10px; font-size: 14px; font-weight: bold; color: #333333; text-align: right; vertical-align: top; white-space:nowrap;">₹${lineTotal.toLocaleString('en-IN')}</td>
          </tr>`
      }).join('')
    : `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #888;">No items found.</td></tr>`

  const discount = Number(order.discount || 0)
  const discountRow = discount > 0
    ? `<tr>
        <td colspan="2" style="padding: 6px 8px; font-size: 13px; color: #555555; text-align: right;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td>
        <td style="padding: 6px 8px; font-size: 13px; color: #d9534f; font-weight: bold; text-align: right;">−₹${discount.toLocaleString('en-IN')}</td>
      </tr>`
    : ''

  const shipping = Number(order.shippingTotal || 0)

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 20px;">You left something behind! ⏰</div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #faf7f2; border-bottom: 2px solid #e8dcc4;">
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: left;">Product</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
        <tfoot style="border-top: 2px solid #e8dcc4;">
          <tr>
            <td colspan="2" style="padding: 8px 8px; font-size: 13px; color: #555555; text-align: right;">Subtotal</td>
            <td style="padding: 8px 8px; font-size: 13px; color: #333333; font-weight: bold; text-align: right;">₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 8px; font-size: 13px; color: #555555; text-align: right;">Shipping</td>
            <td style="padding: 6px 8px; font-size: 13px; color: #333333; text-align: right;">${shipping === 0 ? '<span style="color: #2d8a4e; font-weight: bold;">FREE</span>' : `₹${shipping.toLocaleString('en-IN')}`}</td>
          </tr>
          ${discountRow}
          <tr style="background-color: #fcf4f5;">
            <td colspan="2" style="padding: 12px 8px; font-size: 15px; font-weight: bold; color: #6B1A2A; text-align: right;">Grand Total</td>
            <td style="padding: 12px 8px; font-size: 16px; font-weight: bold; color: #6B1A2A; text-align: right;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="margin-top: 24px; text-align: center;">
      <a href="${shopUrl}" style="display: inline-block; background: linear-gradient(135deg, #4A0F1C, #6B1A2A); color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 700; letter-spacing: 1px;">Shop Now →</a>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Shop now — ${orderNumber}`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `⏰ You left something behind! Shop now — ${orderNumber} | ${company.name}`,
      text: [
        `You left items in your cart!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Grand Total: ₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`,
        ``,
        `Shop now at: ${shopUrl}`,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Abandoned cart recovery sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send abandoned cart email to ${to}:`, err)
    throw err
  }
}

// ─── Order Confirmation (Customer) ───────────────────────

export async function sendOrderConfirmationEmail(
  to: string,
  order: Record<string, unknown>,
  company?: { name: string; email: string },
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) return

  const c = company || await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')

  const logoAttachment = resolveLogoAttachment(c)
  const attachments: any[] = []
  if (logoAttachment) {
    attachments.push(logoAttachment)
  }

  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  // Build detailed order items — same rich breakdown as receipt email
  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemRowsHtml = items.length > 0
    ? items.map(item => {
        const qty = Number(item.quantity || 1)
        const unitPrice = Number(item.unitPrice || item.price || 0)
        const lineTotal = Number(item.total || (qty * unitPrice))
        const gstRate = Number((item as any).gstRate || 5)
        const taxable = lineTotal / (1 + gstRate / 100)
        const gstAmt = lineTotal - taxable

        const color = String(item.color || '')
        const size = String(item.size || '')
        const variantLabel = String(item.variantLabel || '')

        const chips: string[] = []
        if (color) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">🎨 ${color}</span>`)
        if (size) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">📐 ${size}</span>`)
        if (!color && !size && variantLabel) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;">${variantLabel}</span>`)

        const gstBreakdown = `
          <div style="margin-top:8px;padding:8px 10px;background:#fffdf8;border:1px dashed #e8dcc4;border-radius:6px;font-size:11px;color:#666;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:2px 0;color:#888;">Taxable Value</td>
                <td style="padding:2px 0;text-align:right;color:#555;">₹${taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;color:#888;">GST @ ${gstRate}% (incl.)</td>
                <td style="padding:2px 0;text-align:right;color:#888;">₹${gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr style="border-top:1px solid #e8dcc4;">
                <td style="padding:3px 0 0;font-weight:bold;color:#444;">Total (incl. GST)</td>
                <td style="padding:3px 0 0;text-align:right;font-weight:bold;color:#6B1A2A;">₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>`

        return `
          <tr style="border-bottom: 1px solid #f0e8d8;">
            <td style="padding: 14px 10px; font-size: 14px; color: #333333; vertical-align: top;">
              <div style="font-weight:bold;color:#2a0a10;font-size:14px;margin-bottom:4px;">${String(item.name || '')}</div>
              ${chips.length ? `<div style="margin-bottom:6px;">${chips.join('')}</div>` : ''}
              ${gstBreakdown}
            </td>
            <td style="padding: 14px 10px; font-size: 14px; color: #555555; text-align: center; vertical-align: top; white-space:nowrap;">${qty}</td>
            <td style="padding: 14px 10px; font-size: 14px; color: #555555; text-align: right; vertical-align: top; white-space:nowrap;">₹${unitPrice.toLocaleString('en-IN')}</td>
            <td style="padding: 14px 10px; font-size: 14px; font-weight: bold; color: #333333; text-align: right; vertical-align: top; white-space:nowrap;">₹${lineTotal.toLocaleString('en-IN')}</td>
          </tr>`
      }).join('')
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #888;">No items found.</td></tr>`

  // Shipping address
  const addr = order.shippingAddress as Record<string, unknown> | null | undefined
  const shippingBlock = addr
    ? `<div style="margin-top: 20px; padding: 16px; background-color: #faf7f2; border: 1px solid #e8dcc4; border-radius: 8px;">
        <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #6B1A2A; margin-bottom: 8px;">Shipping To</div>
        <div style="font-size: 13px; color: #444444; line-height: 1.7;">
          ${[String(addr.firstName || ''), String(addr.lastName || '')].filter(Boolean).join(' ')}<br/>
          ${String(addr.address || '')}<br/>
          ${[String(addr.city || ''), String(addr.state || '')].filter(Boolean).join(', ')}${addr.pincode ? ` — ${addr.pincode}` : ''}<br/>
          Phone: ${String(addr.phone || '')}
        </div>
      </div>`
    : ''

  const discount = Number(order.discount || 0)
  const discountRow = discount > 0
    ? `<tr>
        <td colspan="3" style="padding: 6px 8px; font-size: 13px; color: #555555; text-align: right;">Discount${order.couponCode ? ` (${order.couponCode})` : ''}</td>
        <td style="padding: 6px 8px; font-size: 13px; color: #d9534f; font-weight: bold; text-align: right;">−₹${discount.toLocaleString('en-IN')}</td>
      </tr>`
    : ''

  const shipping = Number(order.shippingTotal || 0)
  const totalGst = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 1)
    const unitPrice = Number(item.unitPrice || item.price || 0)
    const lineTotal = Number(item.total || (qty * unitPrice))
    const gstRate = Number((item as any).gstRate || 5)
    return sum + (lineTotal - lineTotal / (1 + gstRate / 100))
  }, 0)

  const htmlContent = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Thank you for your order! 🎉</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> has been confirmed successfully.
      We'll notify you once it's dispatched.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Order Summary — ${orderNumber}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #faf7f2; border-bottom: 2px solid #e8dcc4;">
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: left;">Product</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: right;">Price</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888888; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
        <tfoot style="border-top: 2px solid #e8dcc4;">
          <tr>
            <td colspan="3" style="padding: 8px 8px; font-size: 13px; color: #555555; text-align: right;">Subtotal</td>
            <td style="padding: 8px 8px; font-size: 13px; color: #333333; font-weight: bold; text-align: right;">₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 6px 8px; font-size: 13px; color: #555555; text-align: right;">Shipping</td>
            <td style="padding: 6px 8px; font-size: 13px; color: #333333; text-align: right;">${shipping === 0 ? '<span style="color: #2d8a4e; font-weight: bold;">FREE</span>' : `₹${shipping.toLocaleString('en-IN')}`}</td>
          </tr>
          ${discountRow}
          <tr style="background-color: #fffdf5; border-top: 1px solid #e8dcc4;">
            <td colspan="3" style="padding: 8px 8px 4px; font-size: 12px; color: #888888; text-align: right;">GST Included in Price</td>
            <td style="padding: 8px 8px 4px; font-size: 12px; color: #888888; text-align: right;">₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background-color: #fcf4f5;">
            <td colspan="3" style="padding: 12px 8px; font-size: 15px; font-weight: bold; color: #6B1A2A; text-align: right;">Grand Total</td>
            <td style="padding: 12px 8px; font-size: 16px; font-weight: bold; color: #6B1A2A; text-align: right;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${shippingBlock}

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${c.name}</strong>
    </div>
    `,
    `Order Confirmed — ${orderNumber}`,
    Boolean(logoAttachment),
    c.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(c.name),
      to,
      subject: `Order Confirmed — ${orderNumber} | ${c.name}`,
      text: [
        `Thank you for your order!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Total: ₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`,
        `Payment: ${String(order.paymentStatus || 'Pending').toUpperCase()}`,
        ``,
        `We will notify you once your order is dispatched.`,
        `Track your order at: ${frontendUrl}/track-order?orderNumber=${encodeURIComponent(orderNumber)}`,
        ``,
        `Regards,`,
        `${c.name}`,
      ].join('\n'),
      html: htmlContent,
      attachments,
    })
    console.log(`[Email] Order confirmation sent to ${to} for ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send order confirmation to ${to}:`, err)
  }
}

// ─── Admin Order Notification ────────────────────────────

export async function sendAdminOrderNotification(
  to: string,
  order: Record<string, unknown>,
  company?: { name: string; email: string },
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) return

  const c = company || await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')

  try {
    await transporter.sendMail({
      from: emailFrom(c.name),
      to,
      subject: `[Admin] New Order — ${orderNumber}`,
      text: [
        `New order received!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Total: ₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`,
        `Payment: ${String(order.paymentStatus || 'Pending').toUpperCase()}`,
        `Customer: ${String(order.customerEmail || 'Guest')}`,
        ``,
        `Login to admin panel to view details.`,
        ``,
        `Regards,`,
        `${c.name}`,
      ].join('\n'),
    })
    console.log(`[Email] Admin notification sent for ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send admin notification for ${orderNumber}:`, err)
  }
}

// ─── Price Drop Notification ─────────────────────────────────

export async function sendPriceDropEmail(
  to: string,
  customerName: string,
  productInfo: {
    productName: string
    oldPrice: number
    newPrice: number
    discountPercent: number
    imageUrl?: string | null
    slug?: string | null
  },
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping price drop email.')
    return
  }

  const company = await getCompanyInfo()
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'
  const productUrl = productInfo.slug ? `${frontendUrl}/product/${productInfo.slug}` : frontendUrl
  const savings = (productInfo.oldPrice - productInfo.newPrice).toLocaleString('en-IN')

  const logoUrl = resolveLogoUrl(company)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#FBF9F6;padding:24px 40px;text-align:center;border-bottom:3px solid #6B1A2A;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${company.name}" style="max-width:140px;height:auto;display:inline-block;margin-bottom:8px;" />` : ''}
              <h1 style="margin:0;color:#6B1A2A;font-family:Georgia,serif;font-size:24px;letter-spacing:1px;font-weight:700;">${company.name}</h1>
              <p style="margin:6px 0 0;color:#C29B57;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Price Drop Alert</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 20px;color:#4A0F1C;font-size:16px;">Hi <strong>${customerName || 'there'}</strong>,</p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">Great news! The price of a product you might love has just been reduced. Don't miss this deal!</p>
              
              <!-- Product Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border:1px solid #e8dcc4;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <h2 style="margin:0 0 16px;color:#4A0F1C;font-size:18px;font-weight:700;">${productInfo.productName}</h2>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding:0 12px;text-align:center;">
                          <p style="margin:0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Was</p>
                          <p style="margin:4px 0 0;color:#999;font-size:20px;text-decoration:line-through;">&#8377;${productInfo.oldPrice.toLocaleString('en-IN')}</p>
                        </td>
                        <td style="padding:0 12px;font-size:24px;color:#C29B57;">&#8594;</td>
                        <td style="padding:0 12px;text-align:center;">
                          <p style="margin:0;color:#2d8a4e;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Now</p>
                          <p style="margin:4px 0 0;color:#2d8a4e;font-size:24px;font-weight:800;">&#8377;${productInfo.newPrice.toLocaleString('en-IN')}</p>
                        </td>
                      </tr>
                    </table>
                    <div style="margin:16px auto 0;display:inline-block;background:linear-gradient(135deg,#C29B57,#e8c97a);color:#4A0F1C;padding:6px 18px;border-radius:20px;font-size:14px;font-weight:800;letter-spacing:1px;">
                      ${productInfo.discountPercent}% OFF — Save &#8377;${savings}
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${productUrl}" style="display:inline-block;background:linear-gradient(135deg,#4A0F1C,#6B1A2A);color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:1px;">Shop Now &#8594;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#faf7f2;padding:20px 40px;border-top:1px solid #e8dcc4;text-align:center;">
              <p style="margin:0;color:#999;font-size:11px;">You received this email because you are a registered member of ${company.name}.</p>
              <p style="margin:6px 0 0;color:#bbb;font-size:10px;">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const mailOptions: Record<string, unknown> = {
    from: emailFrom(company.name),
    to,
    subject: `Price Drop! ${productInfo.productName} is now Rs.${productInfo.newPrice.toLocaleString('en-IN')} — ${productInfo.discountPercent}% OFF`,
    html,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`[Email] Price drop notification sent to ${to}`)
  } catch (err) {
    console.error(`[Email] Failed to send price drop email to ${to}:`, err)
    throw err
  }
}

// ─── Campaign Email (Price Drop / New Arrival) ────────────────

export async function sendCampaignEmail(
  to: string,
  customerName: string,
  campaign: {
    type: 'price_drop' | 'new_arrival'
    subject: string
    content?: string | null
    products: Array<{
      name: string
      price: number
      originalPrice?: number | null
      discountPercent?: number
      imageUrl?: string | null
      slug?: string | null
    }>
  },
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping campaign email.')
    return
  }

  const company = await getCompanyInfo()
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoUrl = resolveLogoUrl(company)

  const productsHtml = campaign.products.map(p => {
    const productUrl = p.slug ? `${frontendUrl}/product/${p.slug}` : frontendUrl
    const discountBadge = p.discountPercent
      ? `<div style="margin:12px auto 0;display:inline-block;background:linear-gradient(135deg,#C29B57,#e8c97a);color:#4A0F1C;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:1px;">${p.discountPercent}% OFF</div>`
      : ''
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border:1px solid #e8dcc4;border-radius:10px;overflow:hidden;margin-bottom:16px;">
        <tr>
          <td style="padding:20px;text-align:center;">
            ${p.imageUrl ? `<img src="${p.imageUrl.startsWith('http') ? p.imageUrl : `${frontendUrl}${p.imageUrl}`}" alt="${p.name}" style="max-width:180px;height:auto;border-radius:8px;margin-bottom:12px;" />` : ''}
            <h3 style="margin:0 0 8px;color:#4A0F1C;font-size:16px;font-weight:700;">${p.name}</h3>
            ${p.originalPrice ? `<p style="margin:0;color:#999;font-size:14px;text-decoration:line-through;">&#8377;${Number(p.originalPrice).toLocaleString('en-IN')}</p>` : ''}
            <p style="margin:4px 0 0;color:#2d8a4e;font-size:20px;font-weight:800;">&#8377;${Number(p.price).toLocaleString('en-IN')}</p>
            ${discountBadge}
            <div style="margin-top:14px;">
              <a href="${productUrl}" style="display:inline-block;background:linear-gradient(135deg,#4A0F1C,#6B1A2A);color:#ffffff;padding:10px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;">View Product &#8594;</a>
            </div>
          </td>
        </tr>
      </table>`
  }).join('')

  const campaignLabel = campaign.type === 'price_drop' ? 'Price Drop Alert' : 'New Arrivals'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#FBF9F6;padding:24px 40px;text-align:center;border-bottom:3px solid #6B1A2A;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${company.name}" style="max-width:140px;height:auto;display:inline-block;margin-bottom:8px;" />` : ''}
              <h1 style="margin:0;color:#6B1A2A;font-family:Georgia,serif;font-size:24px;letter-spacing:1px;font-weight:700;">${company.name}</h1>
              <p style="margin:6px 0 0;color:#C29B57;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">${campaignLabel}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 20px;color:#4A0F1C;font-size:16px;">Hi <strong>${customerName || 'there'}</strong>,</p>
              ${campaign.content ? `<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">${campaign.content}</p>` : ''}
              ${productsHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#faf7f2;padding:20px 40px;border-top:1px solid #e8dcc4;text-align:center;">
              <p style="margin:0;color:#999;font-size:11px;">You received this email because you are a registered member of ${company.name}.</p>
              <p style="margin:6px 0 0;color:#bbb;font-size:10px;"><a href="${frontendUrl}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#999;text-decoration:underline;">Unsubscribe</a> from marketing emails.</p>
              <p style="margin:2px 0 0;color:#bbb;font-size:10px;">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const mailOptions: Record<string, unknown> = {
    from: emailFrom(company.name),
    to,
    subject: campaign.subject,
    html,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`[Email] Campaign "${campaign.subject}" sent to ${to}`)
  } catch (err) {
    console.error(`[Email] Failed to send campaign email to ${to}:`, err)
    throw err
  }
}

// ─── General Campaign Email (no products, optional image) ────────

export async function sendGeneralEmail(
  to: string,
  customerName: string,
  campaign: {
    subject: string
    content?: string | null
    imageUrl?: string | null
  },
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping general campaign email.')
    return
  }

  const company = await getCompanyInfo()
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoUrl = resolveLogoUrl(company)

  const bannerHtml = campaign.imageUrl
    ? `<tr><td style="padding:0;"><img src="${campaign.imageUrl.startsWith('http') ? campaign.imageUrl : `${frontendUrl}${campaign.imageUrl}`}" alt="" style="width:100%;height:auto;display:block;max-width:600px;" /></td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8f5f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#FBF9F6;padding:24px 40px;text-align:center;border-bottom:3px solid #6B1A2A;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${company.name}" style="max-width:140px;height:auto;display:inline-block;margin-bottom:8px;" />` : ''}
              <h1 style="margin:0;color:#6B1A2A;font-family:Georgia,serif;font-size:24px;letter-spacing:1px;font-weight:700;">${company.name}</h1>
            </td>
          </tr>
          <!-- Banner Image -->
          ${bannerHtml}
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="margin:0 0 20px;color:#4A0F1C;font-size:16px;">Hi <strong>${customerName || 'there'}</strong>,</p>
              ${campaign.content ? `<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.8;">${campaign.content.replace(/\n/g, '<br/>')}</p>` : ''}
              <p style="margin:0;color:#555;font-size:14px;line-height:1.6;">Thank you for being a valued member of the ${company.name} family.</p>
              <p style="margin:16px 0 0;color:#555;font-size:14px;line-height:1.6;">Visit our store to explore more!</p>
              <div style="margin-top:24px;text-align:center;">
                <a href="${frontendUrl}" style="display:inline-block;background:linear-gradient(135deg,#4A0F1C,#6B1A2A);color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:1px;">Visit Store →</a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#faf7f2;padding:20px 40px;border-top:1px solid #e8dcc4;text-align:center;">
              <p style="margin:0;color:#999;font-size:11px;">You received this email because you are a registered member of ${company.name}.</p>
              <p style="margin:6px 0 0;color:#bbb;font-size:10px;"><a href="${frontendUrl}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#999;text-decoration:underline;">Unsubscribe</a> from marketing emails.</p>
              <p style="margin:2px 0 0;color:#bbb;font-size:10px;">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const mailOptions: Record<string, unknown> = {
    from: emailFrom(company.name),
    to,
    subject: campaign.subject,
    html,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`[Email] General campaign "${campaign.subject}" sent to ${to}`)
  } catch (err) {
    console.error(`[Email] Failed to send general campaign to ${to}:`, err)
    throw err
  }
}

// ─── Back-in-Stock Notification Email ────────────────────

export async function sendBackInStockEmail(
  to: string,
  customerName: string | undefined,
  product: { productName: string; variantLabel: string | null },
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping back-in-stock email.')
    return
  }

  const company = await getCompanyInfo()
  const variantStr = product.variantLabel ? ` (${product.variantLabel})` : ''
  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) {
    attachments.push(logoAttachment)
  }
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 15px;">Dear ${customerName || 'Customer'},</div>
    <div style="font-size: 14.5px; line-height: 1.6; color: #555555; margin-bottom: 25px;">
      Great news! <strong>${product.productName}${variantStr}</strong> is now back in stock and available for purchase.
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${frontendUrl}" style="display: inline-block; background: linear-gradient(135deg,#4A0F1C,#6B1A2A); color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 700; letter-spacing: 1px;">Shop Now &#8594;</a>
    </div>
    <div style="font-size: 14px; color: #555555; line-height: 1.5;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Back in Stock — ${product.productName}`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Back in Stock — ${product.productName}`,
      text: [
        `Dear ${customerName || 'Customer'},`,
        ``,
        `Great news! ${product.productName}${variantStr} is now back in stock.`,
        ``,
        `Visit our store to place your order before it sells out again!`,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Back-in-stock notification sent to ${to} for ${product.productName}`)
  } catch (err) {
    console.error(`[Email] Failed to send back-in-stock email to ${to}:`, err)
    throw err
  }
}

// ─── Notify Message to Customer (Admin-written) ─────────

export async function sendNotifyMessageEmail(
  to: string,
  notification: Record<string, unknown>,
  message: string,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping notify message email.')
    return
  }

  const company = await getCompanyInfo()
  const productName = String(notification.productName || 'Product')
  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) {
    attachments.push(logoAttachment)
  }

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 15px;">Dear ${String(notification.customerName || 'Customer')},</div>
    <div style="font-size: 14.5px; line-height: 1.6; color: #555555; margin-bottom: 20px;">
      Here is an update regarding your notification request for <strong>${productName}</strong>:
    </div>
    <div style="margin: 20px 0; padding: 20px; background-color: #faf7f2; border-left: 4px solid #6B1A2A; font-style: italic; color: #333333; line-height: 1.6;">
      ${message.replace(/\n/g, '<br/>')}
    </div>
    <div style="font-size: 14px; color: #555555; line-height: 1.5; margin-top: 25px;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Update regarding ${productName}`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Update regarding ${productName}`,
      text: [
        `Dear ${String(notification.customerName || 'Customer')},`,
        ``,
        `Here is an update regarding your notification request for ${productName}:`,
        ``,
        message,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Notify message sent to ${to} for ${productName}`)
  } catch (err) {
    console.error(`[Email] Failed to send notify message to ${to}:`, err)
    throw err
  }
}

// ─── Shipping / Dispatch Email ───────────────────────────

// ─── Order Packing Notification Email ────────────────────
export async function sendPackingEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping packing email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemCount = items.length
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order is being packed! 📦</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Great news! Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> is currently being carefully packed and will be dispatched soon.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Order Details — ${orderNumber}</div>
      <div style="padding: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888; width: 140px;">Order Number</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #333333;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Items</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333333;">${itemCount} product${itemCount !== 1 ? 's' : ''} (${totalQty} item${totalQty !== 1 ? 's' : ''})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Order Total</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #6B1A2A;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Status</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #d97706;">📦 Being Packed</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="padding: 14px 18px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">✅ We will send you a shipping notification with your tracking details once your order is dispatched.</p>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Your order ${orderNumber} is being packed`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Your order ${orderNumber} is being packed 📦 | ${company.name}`,
      text: [
        `Your order is being packed!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Total: ₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`,
        ``,
        `We will notify you with tracking details once dispatched.`,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Packing notification sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send packing email to ${to}:`, err)
    throw err
  }
}

// ─── Order Shipped / Dispatched Email ─────────────────────

export async function sendShippingEmail(

  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping shipping email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const meta = (order.metadata as Record<string, unknown>) || {}
  const courierName = String(meta.courierName || order.deliveryAgentName || 'Our Courier Partner')
  const trackingNumber = String(order.trackingNumber || '')
  const trackingUrl = String(meta.trackingUrl || '')

  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemCount = items.length
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order has been shipped! 🚚</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Great news! Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> has been dispatched and is on its way to you.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Shipping Details</div>
      <div style="padding: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888; width: 140px;">Courier</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #333333;">${courierName}</td>
          </tr>
          ${trackingNumber ? `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Tracking Number</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #6B1A2A; font-family: monospace;">${trackingNumber}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Items</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333333;">${itemCount} product${itemCount !== 1 ? 's' : ''} (${totalQty} item${totalQty !== 1 ? 's' : ''})</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Your order ${orderNumber} has been shipped`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Your order ${orderNumber} has been shipped! 🚚 | ${company.name}`,
      text: [
        `Your order has been shipped!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Courier: ${courierName}`,
        trackingNumber ? `Tracking Number: ${trackingNumber}` : '',
        trackingUrl ? `Track here: ${trackingUrl}` : '',
        ``,
        `Regards,`,
        `${company.name}`,
      ].filter(Boolean).join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Shipping notification sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send shipping email to ${to}:`, err)
    throw err
  }
}

// ─── Delivery Confirmation Email ─────────────────────────

export async function sendDeliveryEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping delivery email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'
  const reviewUrl = `${frontendUrl}/track-order?orderNumber=${encodeURIComponent(orderNumber)}`

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemRowsHtml = items.length > 0
    ? items.map(item => {
        const qty = Number(item.quantity || 1)
        const unitPrice = Number(item.unitPrice || item.price || 0)
        const lineTotal = Number(item.total || (qty * unitPrice))
        const color = String(item.color || '')
        const size = String(item.size || '')
        const variantLabel = String(item.variantLabel || '')
        const chips: string[] = []
        if (color) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">🎨 ${color}</span>`)
        if (size) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;margin-right:4px;">📐 ${size}</span>`)
        if (!color && !size && variantLabel) chips.push(`<span style="display:inline-block;background:#faf7f2;border:1px solid #e8dcc4;border-radius:4px;padding:2px 8px;font-size:11px;color:#555;">${variantLabel}</span>`)
        return `
          <tr style="border-bottom: 1px solid #f0e8d8;">
            <td style="padding: 14px 10px; font-size: 14px; color: #333333;">
              <div style="font-weight:bold;color:#2a0a10;font-size:14px;margin-bottom:4px;">${String(item.name || '')}</div>
              ${chips.length ? `<div style="margin-bottom:6px;">${chips.join('')}</div>` : ''}
            </td>
            <td style="padding: 14px 10px; font-size: 14px; color: #555555; text-align: center; white-space:nowrap;">${qty}</td>
            <td style="padding: 14px 10px; font-size: 14px; font-weight: bold; color: #333333; text-align: right; white-space:nowrap;">₹${lineTotal.toLocaleString('en-IN')}</td>
          </tr>`
      }).join('')
    : ''

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order has been delivered! ✅</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> has been successfully delivered.
      We hope you love your purchase!
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Delivered Items — ${orderNumber}</div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #faf7f2; border-bottom: 2px solid #e8dcc4;">
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #888888; text-align: left;">Product</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #888888; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #888888; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>
    </div>

    <div style="padding: 14px 18px; background-color: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #2e7d32; font-weight: 600;">We'd love to hear your feedback! Thank you for shopping with us.</p>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Order Delivered — ${orderNumber}`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Your order ${orderNumber} has been delivered! ✅ | ${company.name}`,
      text: [
        `Your order has been delivered!`,
        ``,
        `Order Number: ${orderNumber}`,
        ``,
        `We hope you love your purchase!`,
        `Leave a review at: ${reviewUrl}`,
        ``,
        `Thank you for shopping with us!`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Delivery confirmation sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send delivery email to ${to}:`, err)
    throw err
  }
}

// ─── Out for Delivery Email ──────────────────────────────

export async function sendOutForDeliveryEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping out-for-delivery email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const meta = (order.metadata as Record<string, unknown>) || {}
  const courierName = String(meta.courierName || order.deliveryAgentName || 'Our Courier Partner')
  const agentPhone = String(order.deliveryAgentPhone || '')
  const trackingNumber = String(order.trackingNumber || '')

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order is out for delivery! 🚚</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> is out for delivery and should arrive shortly. Please keep your phone reachable.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Delivery Details — ${orderNumber}</div>
      <div style="padding: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888; width: 140px;">Courier</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #333333;">${courierName}</td>
          </tr>
          ${agentPhone ? `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Delivery Contact</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #333333;">${agentPhone}</td>
          </tr>` : ''}
          ${trackingNumber ? `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Tracking Number</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #6B1A2A; font-family: monospace;">${trackingNumber}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Status</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #d97706;">🚚 Out for Delivery</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Your order ${orderNumber} is out for delivery`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Your order ${orderNumber} is out for delivery 🚚 | ${company.name}`,
      text: [
        `Your order is out for delivery!`,
        ``,
        `Order Number: ${orderNumber}`,
        `Courier: ${courierName}`,
        agentPhone ? `Delivery Contact: ${agentPhone}` : '',
        trackingNumber ? `Tracking Number: ${trackingNumber}` : '',
        ``,
        `Regards,`,
        `${company.name}`,
      ].filter(Boolean).join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Out-for-delivery notification sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send out-for-delivery email to ${to}:`, err)
    throw err
  }
}

// ─── RTO (Return to Origin) Email ────────────────────────

export async function sendRtoEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping RTO email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order is on its way back to us</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Delivery of your order <strong style="color: #6B1A2A;">${orderNumber}</strong> could not be completed, and the courier is returning it to us. We'll email you again once we receive it back and process a refund/replacement.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Order Details — ${orderNumber}</div>
      <div style="padding: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888; width: 140px;">Order Total</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #6B1A2A;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Status</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #b45309;">↩️ Returning to Origin</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Your order ${orderNumber} is being returned to us`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Update on your order ${orderNumber} | ${company.name}`,
      text: [
        `Delivery of your order could not be completed.`,
        ``,
        `Order Number: ${orderNumber}`,
        `The courier is returning the parcel to us. We'll follow up once it's received.`,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] RTO notification sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send RTO email to ${to}:`, err)
    throw err
  }
}

// ─── Returned Email ───────────────────────────────────────

export async function sendReturnedEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping returned email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order has been returned to us</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      We've received order <strong style="color: #6B1A2A;">${orderNumber}</strong> back at our warehouse. Our team will process your refund/replacement shortly and notify you once it's complete.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fcf4f5; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #6B1A2A;">Order Details — ${orderNumber}</div>
      <div style="padding: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888; width: 140px;">Order Total</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #6B1A2A;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Status</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #6b7280;">📦 Returned</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      Regards,<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Your order ${orderNumber} has been returned`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Your order ${orderNumber} has been returned | ${company.name}`,
      text: [
        `We've received your returned order.`,
        ``,
        `Order Number: ${orderNumber}`,
        `We'll process your refund/replacement and notify you once complete.`,
        ``,
        `Regards,`,
        `${company.name}`,
      ].join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Returned notification sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send returned email to ${to}:`, err)
    throw err
  }
}

// ─── Cancellation Email ──────────────────────────────────

export async function sendCancellationEmail(
  to: string,
  order: Record<string, unknown>,
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('[Email] SMTP not configured. Skipping cancellation email.')
    return
  }

  const company = await getCompanyInfo()
  const orderNumber = String(order.orderNumber || '')
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000'

  const logoAttachment = resolveLogoAttachment(company)
  const attachments: any[] = []
  if (logoAttachment) attachments.push(logoAttachment)

  const meta = (order.metadata as Record<string, unknown>) || {}
  const cancelReason = String(order.cancellationReason || meta.cancelReason || '')
  const paymentStatus = String(order.paymentStatus || '')
  const isRefunded = paymentStatus === 'refunded'
  const wasPaid = paymentStatus === 'paid' || meta.razorpayPaymentId

  const html = wrapInEmailTemplate(
    `
    <div style="font-size: 16px; color: #300D14; font-weight: bold; margin-bottom: 6px;">Your order has been cancelled</div>
    <div style="font-size: 14px; line-height: 1.7; color: #555555; margin-bottom: 24px;">
      Your order <strong style="color: #6B1A2A;">${orderNumber}</strong> has been cancelled.
    </div>

    <div style="border: 1px solid #e8dcc4; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background-color: #fef2f2; padding: 12px 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #991b1b;">Cancellation Details</div>
      <div style="padding: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888; width: 140px;">Order Number</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #333333;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Total</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #333333;">₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
          </tr>
          ${cancelReason ? `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #888888;">Reason</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333333;">${cancelReason}</td>
          </tr>` : ''}
        </table>
      </div>
    </div>

    ${wasPaid ? `
    <div style="padding: 14px 18px; background-color: ${isRefunded ? '#e8f5e9' : '#fff8e1'}; border: 1px solid ${isRefunded ? '#a5d6a7' : '#ffe082'}; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: ${isRefunded ? '#2e7d32' : '#8d6e00'}; font-weight: 600;">
        ${isRefunded
          ? 'Your refund has been initiated and will reflect in 5-7 business days.'
          : 'A refund will be initiated shortly and will reflect in 5-7 business days.'}
      </p>
    </div>` : ''}

    <div style="font-size: 13px; margin-top: 24px; color: #555555; line-height: 1.6;">
      If you have any questions, please contact us.<br/>
      <strong>${company.name}</strong>
    </div>
    `,
    `Order Cancelled — ${orderNumber}`,
    Boolean(logoAttachment),
    company.name
  )

  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to,
      subject: `Order Cancelled — ${orderNumber} | ${company.name}`,
      text: [
        `Your order has been cancelled.`,
        ``,
        `Order Number: ${orderNumber}`,
        `Total: ₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`,
        cancelReason ? `Reason: ${cancelReason}` : '',
        wasPaid ? (isRefunded ? 'Your refund has been initiated.' : 'A refund will be initiated shortly.') : '',
        ``,
        `If you have any questions, please contact us.`,
        `${company.name}`,
      ].filter(Boolean).join('\n'),
      html,
      attachments,
    })
    console.log(`[Email] Cancellation email sent to ${to} for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Email] Failed to send cancellation email to ${to}:`, err)
    throw err
  }
}

export async function sendContactNotificationEmail(data: {
  name: string
  email: string
  phonenumber: string
  message: string
}): Promise<void> {
  const company = await getCompanyInfo()
  const adminEmail = env.ADMIN_EMAIL || env.EMAIL_USER || 'admin@a1tex.com'

  console.log(`[Contact] New inquiry from ${data.name} (${data.email}, ${data.phonenumber}): ${data.message}`)

  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    return
  }

  // 1. Send notification to admin
  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to: adminEmail,
      replyTo: data.email,
      subject: `[New Inquiry] Message from ${data.name} | ${company.name}`,
      text: [
        `You have received a new contact inquiry:`,
        ``,
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phonenumber}`,
        `Message:`,
        data.message,
        ``,
        `Date: ${new Date().toLocaleString('en-IN')}`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #6B1A2A; border-bottom: 2px solid #6B1A2A; padding-bottom: 8px;">New Contact Inquiry</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${data.phonenumber}">${data.phonenumber}</a></p>
          <div style="margin-top: 15px; padding: 15px; background: #f8f5f0; border-left: 4px solid #6B1A2A; border-radius: 4px;">
            <strong>Message:</strong><br/>
            ${data.message.replace(/\n/g, '<br/>')}
          </div>
        </div>
      `,
    })
    console.log(`[Email] Contact inquiry notification sent to admin (${adminEmail})`)
  } catch (err) {
    console.error('[Email] Failed to send admin contact notification:', err)
  }

  // 2. Send acknowledgment to customer
  try {
    await transporter.sendMail({
      from: emailFrom(company.name),
      to: data.email,
      subject: `Thank you for contacting ${company.name}`,
      text: `Hello ${data.name},\n\nThank you for reaching out to ${company.name}. We have received your inquiry and our team will get back to you shortly.\n\nYour message:\n${data.message}\n\nWarm regards,\n${company.name}`,
    })
    console.log(`[Email] Contact acknowledgment sent to customer (${data.email})`)
  } catch (err) {
    console.error('[Email] Failed to send customer contact acknowledgment:', err)
  }
}


