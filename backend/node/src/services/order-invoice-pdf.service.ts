import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import type { CompanyInfo } from './settings.service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Bundled in the repo (assets/fonts) so ₹ (U+20B9) renders correctly
// regardless of what fonts happen to be installed on the OS — this file
// sits next to src/ and dist/, so the relative path is the same whether
// running from source (tsx) or from the compiled dist/ output.
const BUNDLED_FONT_REGULAR = path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSans-Regular.ttf')
const BUNDLED_FONT_BOLD = path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSans-Bold.ttf')

interface PdfFonts {
  fontRegular: string
  fontBold: string
}

function registerUnicodeFont(doc: PDFKit.PDFDocument): PdfFonts {
  if (fs.existsSync(BUNDLED_FONT_REGULAR) && fs.existsSync(BUNDLED_FONT_BOLD)) {
    doc.registerFont('Unicode-Regular', BUNDLED_FONT_REGULAR)
    doc.registerFont('Unicode-Bold', BUNDLED_FONT_BOLD)
    return { fontRegular: 'Unicode-Regular', fontBold: 'Unicode-Bold' }
  }

  // Last resort — built-in PDFKit fonts (no ₹ glyph, fallback only)
  console.error('[Invoice PDF] Bundled Unicode font not found at', BUNDLED_FONT_REGULAR, '— ₹ symbol will not render correctly')
  return { fontRegular: 'Helvetica', fontBold: 'Helvetica-Bold' }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '–'
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function defaultCompany(): CompanyInfo {
  return {
    name: 'A1 tex',
    address: 'A1 Tex & elampillai_silks, Elampillai',
    city: 'Salem, Tamil Nadu — 637502',
    gstin: '33ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    phone: '+91 95144 61405',
    email: 'a1texelmpillai@gmail.com',
    invoicePrefix: 'INV',
    logoUrl: '/uploads/a1-tex-logo.png',
  }
}

// Draws one invoice onto the given document, starting at the top of the
// current page. Deliberately does NOT call doc.end() so multiple invoices
// can be rendered onto a single PDF document, one after another.
function renderInvoiceToDoc(
  doc: PDFKit.PDFDocument,
  fonts: PdfFonts,
  COMPANY: CompanyInfo,
  order: Record<string, unknown>,
  invoice: Record<string, unknown>,
): void {
  const { fontRegular, fontBold } = fonts

  const items = (order.items as Array<Record<string, unknown>>) || []
  const itemGstRates = (order.itemGstRates as Record<string, number>) || {}
  const itemHsnCodes = (order.itemHsnCodes as Record<string, string>) || {}
  const shippingAddress = order.shippingAddress as Record<string, unknown> | null | undefined
  const customer = order.Customer as Record<string, unknown> | undefined
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const leftCol = doc.page.margins.left
  let y = doc.page.margins.top

  // Pushes content to the next page when the remaining space on the current
  // one is too small, so long addresses, wrapped item names and totals never
  // overlap the next block.
  const ensureSpace = (needed: number) => {
    if (y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      y = doc.page.margins.top
    }
  }

  // ── Header with Logo ──
  // Resolve logo from multiple candidate paths (robust across dev & compiled dist)
  function resolveLogoPath(): string | null {
    const cwd = process.cwd()
    const candidates: string[] = []
    if (COMPANY.logoUrl) {
      // Strip leading slash and resolve relative to cwd (backend/node)
      const relative = COMPANY.logoUrl.replace(/^\//, '')
      candidates.push(path.join(cwd, relative))
    }
    // Fallback 1: uploads folder inside backend/node
    candidates.push(path.join(cwd, 'uploads', 'a1-tex-logo.png'))
    // Fallback 2: frontend public folder (works in dev when running from backend/node)
    candidates.push(path.join(cwd, '..', '..', 'frontend', 'public', 'a1-tex-logo-transparent.png'))
    candidates.push(path.join(cwd, '..', 'frontend', 'public', 'a1-tex-logo-transparent.png'))
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate
    }
    return null
  }
  const resolvedLogo = resolveLogoPath()

  // Logo is 1400x520 (wide banner). Use fit[] to maintain aspect ratio.
  const LOGO_BOX_W = 120
  const LOGO_BOX_H = 45
  const LOGO_MARGIN_TOP = doc.page.margins.top

  let headerTextX = leftCol
  if (resolvedLogo) {
    doc.image(resolvedLogo, leftCol, LOGO_MARGIN_TOP, { fit: [LOGO_BOX_W, LOGO_BOX_H] })
    headerTextX = leftCol + LOGO_BOX_W + 12
  }

  // Address block beside logo — no company name text (logo already has it)
  const addrY = LOGO_MARGIN_TOP + 2
  doc.fontSize(8).font(fontRegular).fillColor('#666')
  doc.text(COMPANY.address, headerTextX, addrY)
  doc.text(COMPANY.city, headerTextX, addrY + 11)
  doc.text(`GSTIN: ${COMPANY.gstin}`, headerTextX, addrY + 22)
  y = LOGO_MARGIN_TOP + LOGO_BOX_H + 16


  // "TAX INVOICE" heading on the right
  doc.fontSize(18).font(fontBold).fillColor('#333')
  doc.text('TAX INVOICE', leftCol + pageWidth - 120, LOGO_MARGIN_TOP, { width: 120, align: 'right' })
  doc.fontSize(8).font(fontRegular).fillColor('#666')
  doc.text(`PAN: ${COMPANY.pan}`, leftCol + pageWidth - 120, LOGO_MARGIN_TOP + 22, { width: 120, align: 'right' })

  // Horizontal rule
  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 14

  // ── Invoice Meta ──
  doc.fontSize(9).font(fontBold).fillColor('#333')
  doc.text(`Invoice No: `, leftCol, y)
  doc.font(fontRegular).fillColor('#666')
  doc.text(String(invoice.invoiceNumber || ''), leftCol + 62, y)
  y += 14

  doc.font(fontBold).fillColor('#333')
  doc.text(`Invoice Date: `, leftCol, y)
  doc.font(fontRegular).fillColor('#666')
  doc.text(formatDate(invoice.invoiceDate as string), leftCol + 62, y)
  y += 14

  doc.font(fontBold).fillColor('#333')
  doc.text(`Order Ref: `, leftCol, y)
  doc.font(fontRegular).fillColor('#666')
  doc.text(`#${String(order.orderNumber || order.id || '')}`, leftCol + 62, y)
  y += 14

  doc.font(fontBold).fillColor('#333')
  doc.text(`Order Date: `, leftCol, y)
  doc.font(fontRegular).fillColor('#666')
  doc.text(formatDate(order.createdAt as string), leftCol + 62, y)
  y += 14

  doc.font(fontBold).fillColor('#333')
  doc.text(`Payment: `, leftCol, y)
  doc.font(fontRegular).fillColor('#666')
  doc.text(String(order.paymentStatus || '').toUpperCase(), leftCol + 62, y)
  y += 14

  const shipState = shippingAddress?.state ? String(shippingAddress.state) : ''
  const stateCodeMap: Record<string, string> = {
    'Tamil Nadu': '33', 'TN': '33', 'Kerala': '32', 'KL': '32', 'Karnataka': '29', 'KA': '29',
    'Andhra Pradesh': '37', 'AP': '37', 'Telangana': '36', 'TS': '36', 'Maharashtra': '27', 'MH': '27',
    'Gujarat': '24', 'GJ': '24', 'Rajasthan': '08', 'RJ': '08', 'Delhi': '07', 'DL': '07',
    'Uttar Pradesh': '09', 'UP': '09',
  }
  const stateCode = stateCodeMap[shipState] || '33'

  doc.font(fontBold).fillColor('#333')
  doc.text(`Place of Supply: `, leftCol, y)
  doc.font(fontRegular).fillColor('#666')
  doc.text(`${shipState || 'Tamil Nadu'} (${stateCode})`, leftCol + 88, y)
  y += 14

  if (order.couponCode) {
    doc.font(fontBold).fillColor('#333')
    doc.text(`Coupon Code: `, leftCol, y)
    doc.font(fontRegular).fillColor('#666')
    doc.text(String(order.couponCode), leftCol + 76, y)
    y += 14
  }

  y += 10

  // Horizontal rule
  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 14

  // ── Billing / Shipping ──
  doc.fontSize(10).font(fontBold).fillColor('#333')
  doc.text('Bill To:', leftCol, y)
  doc.text('Ship To:', leftCol + 250, y)
  y += 16

  doc.fontSize(8).font(fontRegular).fillColor('#444')

  const addrColWidth = 240
  const billLines: string[] = []
  if (customer) {
    billLines.push([customer.name, customer.company].filter(Boolean).join(', ') || 'Customer')
    billLines.push(`Email: ${String(customer.email || order.customerEmail || '')}`)
    billLines.push(`Phone: ${String(customer.mobile || shippingAddress?.phone || '')}`)
    if (customer.gstin) billLines.push(`GSTIN: ${String(customer.gstin)}`)
  } else {
    billLines.push([shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(' ') || 'Guest')
    billLines.push(`Email: ${String(order.customerEmail || 'Guest')}`)
    if (shippingAddress?.phone) billLines.push(`Phone: ${String(shippingAddress.phone)}`)
  }

  const shipLines: string[] = []
  if (shippingAddress) {
    shipLines.push([shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' '))
    shipLines.push(String(shippingAddress.address || ''))
    shipLines.push([String(shippingAddress.city || ''), String(shippingAddress.state || '')].filter(Boolean).join(', '))
    if (shippingAddress.pincode) shipLines.push(`Pincode: ${shippingAddress.pincode}`)
    shipLines.push(`Phone: ${String(shippingAddress.phone || '')}`)
  }

  const billText = billLines.filter(Boolean).join('\n')
  const shipText = shipLines.filter(Boolean).join('\n')
  const billHeight = doc.heightOfString(billText, { width: addrColWidth })
  const shipHeight = doc.heightOfString(shipText, { width: addrColWidth })
  const blockHeight = Math.max(billHeight, shipHeight, 24)

  ensureSpace(blockHeight + 4)

  doc.text(billText, leftCol, y, { width: addrColWidth })
  doc.text(shipText, leftCol + 250, y, { width: addrColWidth })
  y += blockHeight + 8

  // Horizontal rule
  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 14

  // ── Items Table Header ──
  const colX = {
    sno: leftCol,
    hsn: leftCol + 20,
    product: leftCol + 70,
    variant: leftCol + 190,
    qty: leftCol + 240,
    rate: leftCol + 265,
    taxable: leftCol + 315,
    gst: leftCol + 370,
    gstAmt: leftCol + 400,
    total: leftCol + 445,
  }
  ensureSpace(30)
  const headerY = y

  doc.fontSize(7).font(fontBold).fillColor('#666')
  doc.text('#', colX.sno, headerY)
  doc.text('HSN/SAC', colX.hsn, headerY, { width: 50 })
  doc.text('Product', colX.product, headerY, { width: 120 })
  doc.text('Variant', colX.variant, headerY, { width: 50 })
  doc.text('Qty', colX.qty, headerY, { width: 25, align: 'right' })
  doc.text('Rate', colX.rate, headerY, { width: 50, align: 'right' })
  doc.text('Taxable', colX.taxable, headerY, { width: 55, align: 'right' })
  doc.text('GST%', colX.gst, headerY, { width: 30, align: 'right' })
  doc.text('GST Amt', colX.gstAmt, headerY, { width: 45, align: 'right' })
  doc.text('Total', colX.total, headerY, { width: 70, align: 'right' })

  y = headerY + 14
  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 6

  // ── Compute per-item GST slabs for breakdown ──
  const slabTotals: Record<number, { cgst: number; sgst: number; taxable: number }> = {}

  // ── Items ──
  doc.fontSize(7.5).font(fontRegular).fillColor('#333')
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    const productId = String(item.productId || '')
    const gstRate = Number(itemGstRates[productId] ?? 5)
    const hsnCode = itemHsnCodes[productId] || '5804'
    const gstHalf = gstRate / 2
    const unitPrice = Number(item.unitPrice || 0)
    const qty = Number(item.quantity || 0)
    const lineTotal = Number(item.total || 0)
    const taxableValue = parseFloat((lineTotal * 100 / (100 + gstRate)).toFixed(2))
    const gstAmount = parseFloat((lineTotal - taxableValue).toFixed(2))

    // Accumulate slab totals
    if (!slabTotals[gstRate]) slabTotals[gstRate] = { cgst: 0, sgst: 0, taxable: 0 }
    slabTotals[gstRate].cgst += gstAmount / 2
    slabTotals[gstRate].sgst += gstAmount / 2
    slabTotals[gstRate].taxable += taxableValue

    const nameText = String(item.name || '')
    const variantText = String(item.color || item.size ? (
      [item.color ? `Color: ${item.color}` : '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ')
    ) : (item.variantLabel || '–'))
    const rowHeight = Math.max(
      18,
      doc.heightOfString(nameText, { width: 120 }),
      doc.heightOfString(variantText, { width: 50 }),
    ) + 3

    ensureSpace(rowHeight)

    doc.text(String(i + 1), colX.sno, y)
    doc.text(hsnCode, colX.hsn, y, { width: 50 })
    doc.text(nameText, colX.product, y, { width: 120 })
    doc.text(variantText, colX.variant, y, { width: 50 })
    doc.text(String(qty), colX.qty, y, { width: 25, align: 'right' })
    doc.text(`₹${unitPrice.toLocaleString('en-IN')}`, colX.rate, y, { width: 50, align: 'right' })
    doc.text(`₹${taxableValue.toLocaleString('en-IN')}`, colX.taxable, y, { width: 55, align: 'right' })
    doc.text(`${gstRate}%`, colX.gst, y, { width: 30, align: 'right' })
    doc.text(`₹${gstAmount.toLocaleString('en-IN')}`, colX.gstAmt, y, { width: 45, align: 'right' })
    doc.text(`₹${lineTotal.toLocaleString('en-IN')}`, colX.total, y, { width: 70, align: 'right' })
    y += rowHeight
  }

  y += 8
  ensureSpace(40)
  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 8

  // ── Totals ──
  const totalX = leftCol + 300
  doc.fontSize(9).font(fontRegular).fillColor('#444')
  ensureSpace(16)
  doc.text('Subtotal', totalX, y)
  doc.text(`₹${Number(order.subtotal || 0).toLocaleString('en-IN')}`, totalX + 145, y, { width: 70, align: 'right' })
  y += 16

  const gstTotal = Number(order.gstTotal || 0)
  const taxableAmt = Number(order.taxableAmount || 0)
  if (gstTotal > 0) {
    ensureSpace(14)
    doc.text('Taxable Value', totalX, y)
    doc.text(`₹${taxableAmt.toLocaleString('en-IN')}`, totalX + 145, y, { width: 70, align: 'right' })
    y += 14

    // Show combined GST per rate slab (CGST + SGST on one line)
    const sortedSlabs = Object.keys(slabTotals).map(Number).sort((a, b) => a - b)
    for (const slab of sortedSlabs) {
      const t = slabTotals[slab]
      if (!t) continue
      const half = slab / 2
      const gstLineTotal = t.cgst + t.sgst
      ensureSpace(14)
      doc.text(`GST (${slab}%)`, totalX, y)
      doc.text(`₹${gstLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalX + 145, y, { width: 70, align: 'right' })
      y += 14
    }

  }

  const discount = Number(order.discount || 0)
  if (discount > 0) {
    const coupon = order.coupon as Record<string, unknown> | undefined
    let couponLabel = 'Discount'
    if (order.couponCode) {
      if (coupon?.type === 'percentage') {
        const maxText = coupon.maxDiscount ? ` (max ₹${Number(coupon.maxDiscount).toLocaleString('en-IN')})` : ''
        couponLabel = `Discount (${order.couponCode} — ${coupon.value}% off${maxText})`
      } else if (coupon?.type === 'fixed') {
        couponLabel = `Discount (${order.couponCode} — Flat ₹${Number(coupon.value).toLocaleString('en-IN')} off)`
      } else {
        couponLabel = `Discount (${order.couponCode})`
      }
    }
    ensureSpace(14)
    doc.text(couponLabel, totalX, y)
    doc.text(`-₹${discount.toLocaleString('en-IN')}`, totalX + 145, y, { width: 70, align: 'right' })
    y += 14
  }

  ensureSpace(14)
  doc.text('Shipping', totalX, y)
  doc.text(`₹${Number(order.shippingTotal || 0).toLocaleString('en-IN')}`, totalX + 145, y, { width: 70, align: 'right' })
  y += 14

  ensureSpace(46)
  doc.moveTo(totalX, y).lineTo(totalX + 215, y).strokeColor('#ddd').stroke()
  y += 8

  doc.fontSize(11).font(fontBold).fillColor('#8B1A2B')
  doc.text('Grand Total', totalX, y)
  doc.text(`₹${Number(order.grandTotal || 0).toLocaleString('en-IN')}`, totalX + 145, y, { width: 70, align: 'right' })
  y += 30

  // ── Amount in Words ──
  const grandTotalNum = Number(order.grandTotal || 0)
  doc.fontSize(8).font(fontRegular).fillColor('#666')
  ensureSpace(24)
  doc.text(`Amount in words: Rupees ${numberToWords(grandTotalNum)} Only`, leftCol, y, { width: pageWidth })
  y += 24

  // ── Footer ──
  ensureSpace(30)
  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 10
  doc.fontSize(7.5).font(fontRegular).fillColor('#999')
  doc.text('This is a computer-generated invoice.', leftCol, y, { width: pageWidth, align: 'center' })
  y += 12
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, leftCol, y, { width: pageWidth, align: 'center' })
}

export function generateInvoicePdf(order: Record<string, unknown>, invoice: Record<string, unknown>, company?: CompanyInfo): PDFKit.PDFDocument {
  const COMPANY = company || defaultCompany()
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 36, bottom: 36, left: 40, right: 40 },
    info: {
      Title: `Invoice ${String(invoice.invoiceNumber || '')}`,
      Author: COMPANY.name,
    },
  })

  const fonts = registerUnicodeFont(doc)
  renderInvoiceToDoc(doc, fonts, COMPANY, order, invoice)

  doc.end()
  return doc
}

// Renders every order's full invoice into one PDF — each customer's invoice
// starts on a fresh page so the whole stage prints cleanly, page after page.
export function generateStageInvoicesPdf(orders: Array<Record<string, unknown>>, company?: CompanyInfo): PDFKit.PDFDocument {
  const COMPANY = company || defaultCompany()
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 36, bottom: 36, left: 40, right: 40 },
    info: {
      Title: 'Orders - Invoices',
      Author: COMPANY.name,
    },
  })

  const fonts = registerUnicodeFont(doc)

  orders.forEach((order, idx) => {
    if (idx > 0) doc.addPage()
    const invoice = {
      invoiceNumber: order.invoiceNumber || `INV-${order.orderNumber || order.id}`,
      invoiceDate: order.createdAt || new Date(),
      status: order.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    }
    renderInvoiceToDoc(doc, fonts, COMPANY, order, invoice)
  })

  doc.end()
  return doc
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertBelow1000 = (num: number): string => {
    if (num === 0) return ''
    let result = ''
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' '
      num %= 10
    }
    if (num > 0) {
      result += ones[num] + ' '
    }
    return result.trim()
  }

  let amount = Math.floor(n)
  const paise = Math.round((n - amount) * 100)

  let words = ''
  if (amount >= 100000) {
    words += convertBelow1000(Math.floor(amount / 100000)) + ' Lakh '
    amount %= 100000
  }
  if (amount >= 1000) {
    words += convertBelow1000(Math.floor(amount / 1000)) + ' Thousand '
    amount %= 1000
  }
  if (amount > 0) {
    words += convertBelow1000(amount)
  }

  words = words.trim()
  if (paise > 0) {
    const paiseWords = convertBelow1000(paise)
    words += ` and ${paiseWords} Paise`
  }

  return words || 'Zero'
}
